# Project Structure

This project is organized as a full-stack app with a Node/Express backend, a React/Vite frontend, and a local EfficientNetV2 image model.

## Root

- `README.md` - setup, model placement, and local run instructions.
- `.gitignore` - excludes generated files, local secrets, build output, caches, uploads, and large model binaries.
- `models/` - local production model assets for image prediction.
- `docs/` - project documentation.

## Backend

`backend/` contains the API server and detection services.

- `backend/server.js` - Express app entry point.
- `backend/config/` - database configuration.
- `backend/routes/` - API routes for auth, classes, submissions, and analysis.
- `backend/services/` - reusable backend services.
- `backend/services/ImageService.ts` - image analysis orchestration, model path resolution, prediction process spawning, and result shaping.
- `backend/services/efficientnetv2_predict.py` - Python TensorFlow/Keras inference script for the EfficientNetV2 model.
- `backend/services/TextService.ts` - text AI-detection service integration.
- `backend/services/FileTextExtractor.ts` - document text extraction helpers.
- `backend/requirements.txt` - Python packages required for image prediction.
- `backend/package.json` - Node dependencies and backend scripts.

Backend commands:

```powershell
cd backend
npm install
pip install -r requirements.txt
npm run dev
```

## Frontend

`frontend/` contains the user interface.

- `frontend/src/auth/` - login and signup screens.
- `frontend/src/components/` - shared UI and layout components.
- `frontend/src/screens/` - student, teacher, and shared application screens.
- `frontend/src/services/` - frontend API and offline service helpers.
- `frontend/src/config/` - API configuration.
- `frontend/src/utils/` - utility functions.
- `frontend/public/` - static public assets.

Frontend commands:

```powershell
cd frontend
npm install
npm run dev
```

## Models

Only the active production image model files should live in `models/`:

```text
models/
├── efficientnetv2_ai_human.keras
└── labels.json
```

`labels.json` must contain:

```json
{
  "0": "Human",
  "1": "AI-generated"
}
```

The `.keras` file is intentionally ignored by Git because it is too large for normal repository storage. Place it manually in `models/` before testing image prediction. `labels.json` should stay beside the model.

## Image Prediction

Prediction logic is split between TypeScript and Python:

- `backend/services/ImageService.ts` finds `models/efficientnetv2_ai_human.keras` and `models/labels.json`, keeps a reusable Python predictor worker alive, sends uploaded image bytes to Python, and formats the result for the app.
- `backend/services/efficientnetv2_predict.py` loads the Keras model, decodes the uploaded image, handles EXIF orientation, converts to RGB, resizes to `224x224`, adds the batch dimension, predicts, and maps sigmoid output to `Human`, `AI-generated`, or `Needs Review`.

The predictor uses `IMAGE_MODEL_INPUT_SCALE=0_1` for the current saved model because smoke testing returned finite predictions with `0_1` inputs. Use `IMAGE_MODEL_INPUT_SCALE=raw` only for models trained/exported with EfficientNetV2 preprocessing included.

## Testing Image Prediction

1. Confirm the files exist:

   ```powershell
   Test-Path models\efficientnetv2_ai_human.keras
   Get-Content models\labels.json
   ```

2. Confirm TensorFlow is installed in the Python environment used by the backend:

   ```powershell
   python -c "import tensorflow as tf; print(tf.__version__)"
   ```

3. Start the backend:

   ```powershell
   cd backend
   npm run dev
   ```

4. Start the frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

5. Upload an image through the app. Results should show `Human`, `AI-generated`, or `Needs Review`, plus confidence, AI probability, Human probability, threshold, and message.

For demo sample testing, see `docs/image-model-demo-guide.md`.

## Cleaned Legacy Artifacts

The project no longer uses legacy image model artifacts. The old backend model export folder and generated model files were removed during cleanup.
