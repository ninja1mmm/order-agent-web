# Prototype 5.0

Open `http://localhost:3001/prototype-5.0/index.html`.

This iteration focuses on task-scoped parsing review:

- Email body, attachments, Excel sheets, and parsing tasks form a source tree.
- Every Excel sheet creates a separate task; there is no multi-sheet merge scope.
- Material, date, and quantity review use the same complete result table and keep edits synchronized.
- Firm/Forecast and merge strategy follow the current parse-review data model.
- Merge preview mirrors the Orders page without task-specific banners or unsupported metrics.
