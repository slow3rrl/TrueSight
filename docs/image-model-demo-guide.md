# Image Model Demo Guide

## Active Model

- Model: EfficientNetV2 Keras model
- Model path: `models/efficientnetv2_ai_human.keras`
- Labels path: `models/labels.json`
- Labels:

```json
{
  "0": "Human",
  "1": "AI-generated"
}
```

## Preprocessing

The prediction pipeline:

1. Decodes the uploaded image and rejects corrupted or unsupported files.
2. Applies EXIF orientation correction.
3. Converts the image to RGB.
4. Resizes the image to `224x224`.
5. Converts the image to a NumPy array.
6. Adds the batch dimension.
7. Applies `IMAGE_MODEL_INPUT_SCALE`.

The current saved model returns finite predictions with `IMAGE_MODEL_INPUT_SCALE=0_1`, so that is the active demo setting. Use `IMAGE_MODEL_INPUT_SCALE=raw` only when the model was trained/exported with EfficientNetV2 preprocessing included.

## Threshold Settings

Configure these in `backend/.env`:

```env
IMAGE_MODEL_INPUT_SCALE=0_1
IMAGE_AI_THRESHOLD=0.50
IMAGE_HUMAN_CONFIDENT_MAX=0.40
IMAGE_AI_CONFIDENT_MIN=0.60
IMAGE_PREDICTOR_TIMEOUT_MS=120000
```

Meaning:

- `IMAGE_AI_THRESHOLD`: base sigmoid threshold for the raw model label.
- `IMAGE_HUMAN_CONFIDENT_MAX`: AI probability at or below this value is reported as `Human`.
- `IMAGE_AI_CONFIDENT_MIN`: AI probability at or above this value is reported as `AI-generated`.
- Values between `IMAGE_HUMAN_CONFIDENT_MAX` and `IMAGE_AI_CONFIDENT_MIN` are reported as `Needs Review`.

Current default behavior:

- `0.00` to `0.40`: `Human`
- `0.40` to `0.60`: `Needs Review`
- `0.60` to `1.00`: `AI-generated`

## Demo Sample Folders

Place demo images here:

```text
demo_samples/
├── human/
│   └── place human-made sample images here
├── ai_generated/
│   └── place AI-generated sample images here
└── mixed/
    └── place difficult or uncertain images here
```

Do not add private or sensitive student work to the repository.

## Run the Demo Test Script

From the project root:

```powershell
python scripts/test_image_model.py
```

To use the same Python executable configured for the backend:

```powershell
& "C:\Users\daniel jay bernadas\AppData\Local\Programs\Python\Python312\python.exe" scripts/test_image_model.py
```

The script tests thresholds:

```text
0.40, 0.45, 0.50, 0.55, 0.60
```

Override them with:

```powershell
python scripts/test_image_model.py --thresholds 0.45,0.50,0.55
```

## Result Meanings

- `Human`: the model probability is confidently below the review band.
- `AI-generated`: the model probability is confidently above the review band.
- `Needs Review`: the image has mixed signals and should be reviewed manually.

The model output should be treated as a review signal, not standalone proof.
