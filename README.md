# TrueSight

AI-powered academic integrity management system for classroom submissions. The app lets students submit text, documents, and images, while teachers review AI-detection results, class activity, and submission history.

## Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, PostgreSQL
- Text detection: GPTZero-compatible API integration
- Image detection: local EfficientNetV2 Keras model through Python/TensorFlow

## Active Image Model

The production image classifier is:

- Model: `models/efficientnetv2_ai_human.keras`
- Labels: `models/labels.json`
- Classes: `Human` and `AI-generated`
- Input: RGB image resized to `224x224`
- Output: binary sigmoid probability
- Review label: `Needs Review` when the score is close to the configured threshold

`models/labels.json` must contain:

```json
{
  "0": "Human",
  "1": "AI-generated"
}
```

The `.keras` file is large and is intentionally ignored by Git. Place it manually at `models/efficientnetv2_ai_human.keras` before running image prediction. Keep `models/labels.json` in the same folder.

## Project Structure

```text
project-root/
├── backend/
│   ├── config/
│   ├── routes/
│   ├── services/
│   │   ├── ImageService.ts
│   │   └── efficientnetv2_predict.py
│   ├── requirements.txt
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
├── models/
│   ├── efficientnetv2_ai_human.keras
│   └── labels.json
├── docs/
│   └── project-structure.md
├── .gitignore
└── README.md
```

The current backend layout is intentionally kept simple instead of forcing a larger `backend/app` migration.

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://user:password@localhost:5432/database_name
JWT_SECRET=replace_me
GPTZERO_API_KEY=replace_me
GPTZERO_API_URL=https://api.gptzero.me/v2/predict/text

# Optional when the default python executable is not the TensorFlow environment.
PYTHON_EXECUTABLE=C:\Path\To\Python\python.exe

# Optional absolute-path overrides. Leave unset to use the top-level models/ folder.
# IMAGE_MODEL_PATH=C:\Path\To\efficientnetv2_ai_human.keras
# IMAGE_LABELS_PATH=C:\Path\To\labels.json

# Image model preprocessing and thresholds.
IMAGE_MODEL_INPUT_SCALE=0_1
IMAGE_AI_THRESHOLD=0.50
IMAGE_HUMAN_CONFIDENT_MAX=0.40
IMAGE_AI_CONFIDENT_MIN=0.60
IMAGE_PREDICTOR_TIMEOUT_MS=120000
```

## Backend Setup

```powershell
cd backend
npm install
pip install -r requirements.txt
npm run dev
```

The backend starts on `http://localhost:5000` by default.

Python dependencies are listed in `backend/requirements.txt`:

- `tensorflow`
- `numpy`
- `pillow`

Use a Python version supported by your installed TensorFlow package. If you use a virtual environment, set `PYTHON_EXECUTABLE` to that environment's Python executable.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` by default.

## Image Prediction Flow

Prediction is handled by:

- Backend orchestration: `backend/services/ImageService.ts`
- Python inference script: `backend/services/efficientnetv2_predict.py`
- Model assets: `models/efficientnetv2_ai_human.keras` and `models/labels.json`

The backend starts a reusable Python EfficientNetV2 worker so TensorFlow and the
Keras model are loaded once and reused across image analyses. The Python
predictor:

1. Loads `models/efficientnetv2_ai_human.keras`.
2. Loads `models/labels.json`.
3. Warms up the model once during backend startup.
4. Decodes the uploaded image and handles EXIF orientation.
5. Converts it to RGB.
5. Resizes it to `224x224`.
6. Converts it to a NumPy array and adds the batch dimension.
7. Uses `IMAGE_MODEL_INPUT_SCALE=0_1` for the current saved model, which returns finite predictions with `0_1` inputs. Use `raw` only if the model was trained/exported with built-in EfficientNetV2 preprocessing.
8. Runs Keras prediction and applies configurable threshold/review-band handling.
9. Returns `Human`, `AI-generated`, or `Needs Review` with confidence, AI probability, Human probability, threshold, message, and timing data.

Default image thresholds:

- `AI probability <= 40%`: `Human`
- `40% < AI probability < 60%`: `Needs Review`
- `AI probability >= 60%`: `AI-generated`

## Testing Image Prediction

1. Confirm the model files exist:

   ```powershell
   Test-Path models\efficientnetv2_ai_human.keras
   Get-Content models\labels.json
   ```

2. Confirm Python can import TensorFlow:

   ```powershell
   python -c "import tensorflow as tf; print(tf.__version__)"
   ```

3. Start the backend and frontend.

4. Submit an image through the app. The result can be:

   - `Human`
   - `AI-generated`
   - `Needs Review`

If prediction fails, the backend returns a fallback result with an error message in the image analysis details.

For capstone demo testing, place known images under:

```text
demo_samples/human/
demo_samples/ai_generated/
demo_samples/mixed/
```

Then run:

```powershell
python scripts/test_image_model.py
```

To compare thresholds:

```powershell
python scripts/test_image_model.py --thresholds 0.40,0.45,0.50,0.55,0.60
```

See `docs/image-model-demo-guide.md` for threshold calibration guidance.

## Useful Checks

Backend TypeScript:

```powershell
cd backend
.\node_modules\.bin\tsc.cmd --noEmit
```

Frontend build:

```powershell
cd frontend
npm run build
```

Python syntax:

```powershell
python -m py_compile backend\services\efficientnetv2_predict.py
```

## Cleanup Notes

Legacy image model artifacts are not used. The active image model path is the top-level `models/` folder. Build output, logs, temporary uploads, Python caches, local virtual environments, and large model binaries are ignored by Git.
