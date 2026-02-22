# JEGNIT Logo Placement

## Where to Save the Logo

Save your JEGNIT logo file in the following location:

```
frontend/public/logo.png
```

## File Requirements

- **File name**: `logo.png` (or `logo.jpg`, `logo.svg`)
- **Recommended size**: 40x40 pixels to 80x80 pixels
- **Format**: PNG (with transparency), JPG, or SVG

## How It Works

The logo is automatically displayed in the sidebar. If the logo file is not found, the logo image will be hidden and only the text "JEGNIT" will be shown.

## Alternative Locations

If you want to use a different filename or location, you can update the `App.jsx` file:

```jsx
<img src="/your-logo-filename.png" alt="JEGNIT Logo" />
```

The `/` prefix means the file should be in the `public` folder.

## Testing

1. Place your logo file in `frontend/public/logo.png`
2. Restart the dev server if it's running
3. The logo should appear in the sidebar
