import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import pool from "../config/db.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let authSchemaReady = false;
const MAX_PROFILE_IMAGE_LENGTH = 2_000_000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const ensureAuthSchema = async () => {
  if (authSchemaReady) return;

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS profile_picture TEXT
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
    ON users (google_id)
    WHERE google_id IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  authSchemaReady = true;
};

const ensureUserPreferences = async (userId, notificationsEnabled = true) => {
  await pool.query(
    `INSERT INTO user_preferences (user_id, notifications_enabled)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET
       notifications_enabled = EXCLUDED.notifications_enabled,
       updated_at = NOW()`,
    [userId, notificationsEnabled],
  );
};

const getUserProfileById = async (userId) => {
  const user = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            COALESCE(u.profile_image_url, u.profile_picture) AS profile_image_url,
            u.profile_picture,
            COALESCE(up.notifications_enabled, TRUE) AS notifications
     FROM users u
     LEFT JOIN user_preferences up ON up.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );

  return user.rows[0] ?? null;
};

const protect = async (req, res, next) => {
  try {
    await ensureAuthSchema();

    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Not authorized. No token found." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserProfileById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

router.post("/signup", async (req, res) => {
  try {
    await ensureAuthSchema();

    const { name, email, password, role } = req.body;
    const normalizedName = String(name ?? "").trim();
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    const normalizedRole = role === "teacher" ? "teacher" : "student";

    if (!normalizedName || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }

    const userExists = await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [
      normalizedEmail,
    ]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [normalizedName, normalizedEmail, hashedPassword, normalizedRole],
    );

    await ensureUserPreferences(newUser.rows[0].id, true);
    const profile = await getUserProfileById(newUser.rows[0].id);

    return res.status(201).json({
      message: "User registered successfully.",
      user: profile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during signup.",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    await ensureAuthSchema();

    const { email, password } = req.body;
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }

    const user = await pool.query(
      `SELECT u.id, u.name, u.email, u.password, u.role, u.created_at,
              COALESCE(u.profile_image_url, u.profile_picture) AS profile_image_url,
              u.profile_picture,
              COALESCE(up.notifications_enabled, TRUE) AS notifications
       FROM users u
       LEFT JOIN user_preferences up ON up.user_id = u.id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const userData = user.rows[0];
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (userData.notifications === null || userData.notifications === undefined) {
      await ensureUserPreferences(userData.id, true);
      userData.notifications = true;
    }

    const token = generateToken(userData.id);
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        created_at: userData.created_at,
        profile_image_url: userData.profile_image_url ?? null,
        notifications: Boolean(userData.notifications),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during login.",
      error: error.message,
    });
  }
});

router.get("/google/config", async (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";

  return res.status(200).json({
    configured: Boolean(clientId),
    clientId: clientId || null,
  });
});

router.post("/google", async (req, res) => {
  try {
    await ensureAuthSchema();

    const { credential, role } = req.body;
    const normalizedRole = role === "teacher" ? "teacher" : "student";

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Google authentication is not configured on the server.",
      });
    }

    let payload;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    if (!payload) {
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    const googleId = String(payload.sub ?? "").trim();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const name = String(payload.name ?? email.split("@")[0] ?? "Google User").trim();
    const picture =
      typeof payload.picture === "string" && payload.picture.trim()
        ? payload.picture.trim()
        : null;

    if (!googleId) {
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    if (!email) {
      return res.status(400).json({ message: "Google account email is missing." });
    }

    if (payload.email_verified === false) {
      return res.status(401).json({
        message: "Google account email is not verified.",
      });
    }

    const existing = await pool.query(
      `SELECT id, google_id, profile_image_url, profile_picture
       FROM users
       WHERE google_id = $1 OR LOWER(email) = $2
       ORDER BY CASE WHEN google_id = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [googleId, email],
    );

    let userId;

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      userId = user.id;

      if (user.google_id && user.google_id !== googleId) {
        return res.status(409).json({
          message: "This email is already linked to another Google account.",
        });
      }

      await pool.query(
        `UPDATE users
         SET google_id = COALESCE(google_id, $2),
             profile_picture = COALESCE(profile_picture, $3),
             profile_image_url = COALESCE(profile_image_url, $3)
         WHERE id = $1`,
        [userId, googleId, picture],
      );
    } else {
      const generatedPassword = await bcrypt.hash(
        `google:${googleId}:${Date.now()}`,
        10,
      );

      const created = await pool.query(
        `INSERT INTO users (
           name, email, password, role, google_id, profile_image_url, profile_picture
         )
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         RETURNING id`,
        [name || email, email, generatedPassword, normalizedRole, googleId, picture],
      );

      userId = created.rows[0].id;
    }

    await ensureUserPreferences(userId, true);

    const profile = await getUserProfileById(userId);
    const token = generateToken(userId);
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      token,
      user: profile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during Google login.",
      error: error.message,
    });
  }
});

router.get("/me", protect, async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

router.patch("/me", protect, async (req, res) => {
  try {
    await ensureAuthSchema();

    const { name, email, notifications, profileImageUrl } = req.body;
    const hasName = typeof name === "string";
    const hasEmail = typeof email === "string";
    const hasNotifications = typeof notifications === "boolean";
    const hasProfileImage =
      typeof profileImageUrl === "string" || profileImageUrl === null;

    if (!hasName && !hasEmail && !hasNotifications && !hasProfileImage) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: name, email, profile image, or notifications.",
      });
    }

    const nextName = hasName ? name.trim() : req.user.name;
    const nextEmail = hasEmail ? email.trim().toLowerCase() : req.user.email;
    const nextProfileImage =
      hasProfileImage && typeof profileImageUrl === "string"
        ? profileImageUrl.trim() || null
        : hasProfileImage
          ? null
          : req.user.profile_image_url ?? null;

    if (!nextName) {
      return res.status(400).json({ message: "Name cannot be empty." });
    }

    if (!nextEmail) {
      return res.status(400).json({ message: "Email cannot be empty." });
    }

    if (
      typeof nextProfileImage === "string" &&
      nextProfileImage.length > MAX_PROFILE_IMAGE_LENGTH
    ) {
      return res.status(413).json({
        message: "Profile image is too large. Please upload a smaller image.",
      });
    }

    if (nextEmail !== req.user.email) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2",
        [nextEmail, req.user.id],
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "Email is already in use." });
      }
    }

    await pool.query(
      `UPDATE users
       SET name = $1, email = $2, profile_image_url = $3
       WHERE id = $4`,
      [nextName, nextEmail, nextProfileImage, req.user.id],
    );

    if (hasNotifications) {
      await ensureUserPreferences(req.user.id, notifications);
    } else {
      await pool.query(
        `INSERT INTO user_preferences (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id],
      );
    }

    const profile = await getUserProfileById(req.user.id);

    return res.status(200).json({
      message: "Account updated successfully.",
      user: profile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update account settings.",
      error: error.message,
    });
  }
});

router.delete("/me", protect, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.cookie("token", "", { ...cookieOptions, maxAge: 1 });

    return res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete account.",
      error: error.message,
    });
  }
});

router.post("/logout", (req, res) => {
  res.cookie("token", "", { ...cookieOptions, maxAge: 1 });

  return res.json({ message: "Logged out successfully." });
});

export default router;
