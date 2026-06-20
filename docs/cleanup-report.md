# Cleanup Report

## Deleted Files And Folders

- `backend/models/image_model/metadata.json`
- `backend/models/image_model/model.json`
- `backend/models/image_model/weights.bin`
- `backend/models/image_model/resnet50_real_fake_model.keras`
- `backend/models/image_model/`
- `backend/models/`
- `frontend/dist/`
- `frontend/vite-dev.log`
- root `node_modules/`
- `backend/node_modules/`
- `frontend/src/assets/hero.png`
- `frontend/src/assets/react.svg`
- `frontend/src/assets/vite.svg`
- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/Layout.tsx`

## Moved Files

- `backend/models/image_model/efficientnetv2_ai_human.keras` -> `models/efficientnetv2_ai_human.keras`
- `backend/models/image_model/labels.json` -> `models/labels.json`

## Updated Files

- `.gitignore` - added ignores for caches, virtual environments, logs, build output, uploads, Kaggle output, notebook checkpoints, and large local model binaries.
- `README.md` - replaced outdated image-model documentation with EfficientNetV2 setup and run instructions.
- `docs/project-structure.md` - added project layout and prediction-flow documentation.
- `backend/package.json` and `backend/package-lock.json` - removed the unused `@tensorflow/tfjs` dependency.
- `backend/services/ImageService.ts` - updated model discovery to use the top-level `models/` folder.
- `frontend/src/components/ProfileSection.tsx` - reworded old generic `real app` wording.
- `frontend/src/screens/teacher/CreateClass.tsx` - reworded old generic `real app` wording.
- `frontend/src/screens/teacher/IntegrityAnalyticsPage.tsx` - changed `Real-time` wording to `Live`.

## Active Production Model Files

- `models/efficientnetv2_ai_human.keras`
- `models/labels.json`

`models/labels.json` must contain:

```json
{
  "0": "Human",
  "1": "AI-generated"
}
```

## Manual Review

- `frontend/node_modules/` was mostly removed, but Windows denied removal of one native Tailwind binary: `frontend/node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node`. Delete `frontend/node_modules/` manually after closing any process that may hold that file.
- Full image prediction could not be run in the current Python environment because TensorFlow is not installed. Install `backend/requirements.txt` in the Python environment used by `PYTHON_EXECUTABLE`.
- Broad frontend UI-library pruning was intentionally conservative. Shared UI components were kept unless references proved they were unused.
