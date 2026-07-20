# Safex Editor

Safex Editor is a desktop visual editor for Safex projects. It lets you inspect and edit React/TSX components, manage project assets, preview scenes, and save component changes back to the project.

## Supported platforms

The desktop application is configured for:

- macOS (DMG)
- Windows (NSIS installer; x86 and x64)
- Linux (Deb and AppImage)

### Build from source

To run the editor from this repository, install [Bun](https://bun.sh/), then run:

```sh
git clone https://github.com/Safe-engine/safe-x-editor.git
cd safe-x-editor
bun install
bun run dev
```

To create a production build, run `bun run build`. On macOS, package the application with `bun run package`; on Windows, use `bun run package-win`.

## Using the editor

1. Start the editor with `safex editor` or `bun run dev`.
2. Open an existing project with **File > Open** (`Cmd+O` on macOS or `Ctrl+O` on Windows/Linux), then select its root folder. The project must have a `package.json` that declares an `@safe-engine` dependency.
3. Select a component from the project tree to edit it. Use the asset and properties panels to adjust the component, and use the scene preview to review the result.
4. Save the updated component with **File > Save** (`Cmd+S` on macOS). On Windows and Linux, use the save action shown in the editor when it is available.

To start a new Safex project, choose **File > New** (`Cmd+N` or `Ctrl+N`), select a parent folder, and enter a project name. Creating a project downloads the Safex starter template and runs `bun install`, so it requires an internet connection and Bun on your `PATH`.

Use **File > Open With** to reveal the current project in Finder or open it in VS Code, Codex, or another configured application.
