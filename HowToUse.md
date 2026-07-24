# How to Use Safex Editor

Safex Editor is a desktop visual editor for Safex projects. Use it to open a project, compose its scene hierarchy, inspect and edit nodes, preview the result, and save the generated component back to the project.

## Before you begin

- Install [Bun](https://bun.sh/).
- Open a Safex project folder. The folder must contain a `package.json` with an `@safe-engine` dependency.
- To run this repository in development, use `bun install` followed by `bun run dev`.

## Start or open a project

### Create a project

Choose **File > New** (`Cmd+N` on macOS; `Ctrl+N` on Windows/Linux), then:

1. Enter a project name.
2. Choose the parent folder with **Browse**.
3. Select **Create**.

The editor creates a Safex starter project, installs dependencies with Bun, and opens it. This requires an internet connection and Bun on your `PATH`.

### Open an existing project

Choose **File > Open** (`Cmd+O` / `Ctrl+O`) and select the project root folder. The Components panel loads the project and opens the first component it finds. The last project and component are restored when the app is reopened.

## Editor layout

The app has four resizable panels. Their arrangement adapts to the design resolution: the hierarchy is below the preview for wide scenes and beside it for tall scenes.

| Panel | What it does |
| --- | --- |
| **Components / Resources** | Browse project components and resource files, filter them, reload project data, and drag items into the scene. |
| **Scene preview** | Interactively preview the loaded component and edit its composition visually. |
| **Hierarchy** | View, select, focus, reorder, and reparent scene nodes. |
| **Properties** | Edit the selected node, its Safex component properties, attached components, colors, and collider settings. |

## Components and resources

### Components

- Select a component in the **Components** tab to load it into the preview.
- Use **Filter components** to narrow the tree.
- Select the refresh button to reload the project file list.
- Drag a component into the preview or hierarchy to add it as a node.

### Resources

- Switch to the **Resources** tab to browse the `res` folder.
- Use **Filter resources** to find files by name, path, type, or extension.
- Select an image, sprite frame, spritesheet frame, Spine asset, or DragonBones asset to view a preview where available.
- Use the refresh button to run the project resource-sync command and reload the resources.
- Drag a sprite frame or spritesheet frame into the preview or hierarchy to create a `Sprite` node. Other dropped assets create a basic `Node`.

## Build a scene

### Select and organize nodes

- Select nodes in either the scene preview or **Hierarchy**; selection stays synchronized between both.
- Use Ctrl/Cmd-click for multi-selection.
- Drag hierarchy entries to reorder nodes or move them under another parent.
- Double-click a hierarchy item to focus that node in the preview.
- Press `Delete` or `Backspace` to remove the selected nodes. The root scene component cannot be deleted.

### Add nodes

- Drag a component, sprite frame, or other resource to the preview to add it at the scene root.
- Drag the same item onto a hierarchy node to add it as that node’s child.

### Preview editing controls

- Drag selected nodes in the preview to position them.
- Use the visual handles to resize, rotate, and adjust the anchor point.
- Use the mouse wheel to zoom the scene.
- Hold `Shift` while using the mouse to avoid normal handle editing and access keyboard edit controls.
- `Shift` + `-` / `=` zooms out / in.
- `Shift` + `X` or `Y` locks or unlocks resizing on that axis.
- `Shift` + `H` toggles the selected node’s visibility.
- `Shift` + arrow keys moves selected nodes by 10 pixels.
- `Shift` + `C` selects the selected node’s children.

## Edit properties

Select a node to open the **Properties** panel. Changes update the preview immediately and are applied to every selected node when multi-selecting.

### Node settings

You can edit:

- Active state, name, tag, position, rotation, scale, anchor, size, draw order, and color.
- Additional node fields, including JSON values and boolean fields.
- Reset a node’s explicit size to return to its asset-based size.

### Safex component settings

The inspector exposes the selected node’s component properties. It provides specialized controls for:

- Sprite-frame selection with thumbnail search.
- Sprite tiling and nine-slice cap insets.
- Label outline and shadow settings.
- Spine skeleton skin and animation selection.
- Widget insets, center alignment, and safe-area behavior.
- Box collider size, offset, collision tag, and an in-preview collider editor.
- Spine Bones Control: add, remove, name, and position bone controls.

Use the small open button beside a component header to open that component’s source in the editor.

### Add attached components

Select **+ Add Component** at the bottom of the inspector to attach supported components:

- Box Collider
- Circle Collider
- Polygon Collider
- Widget
- RigidBody
- Spine Bones Control (available for `SpineSkeleton` nodes)

## Manage project colors and collisions

### Project colors

In the node color field, select the edit button to open **Edit Colors**. Add, rename, remove, or change RGBA values for project colors, then save. The project and preview reload with the updated palette.

### Collision groups

For a box collider, select the edit button beside **Tag** to open **Collider Settings**. There you can add, rename, and remove groups, and set the collision matrix by checking the group pairs that should collide.

## AI sprite-image editing

1. Select a node with a sprite-frame field.
2. Choose a sprite frame, then select the pencil button.
3. Enter a prompt and choose **Replace** or **New**.
4. Select **Generate**.
5. Click a generated variant to either replace the original image or create a new sprite asset.

Configure the image provider first in **File > Settings > Image AI**. The editor supports `agy`, Codex, Claude, and an OpenAI-compatible endpoint. You can choose a model, set the number of generated images, and provide a system prompt; OpenAI-compatible endpoints additionally require a base URL and API key.

## Save, undo, and reload

- **Save:** `Cmd+S` on macOS or `Ctrl+S` on Windows/Linux saves the edited component to its project source.
- **Undo:** `Cmd/Ctrl+Z`.
- **Redo:** `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.
- **Reload current component:** use the refresh button in the **Hierarchy** panel, or `Cmd/Ctrl+R` in the preview.
- **Reload project data and component:** `Cmd/Ctrl+A` in the preview.

## Open the project elsewhere

Choose **File > Open With** to reveal the project in Finder or open it in VS Code, Codex, or another application.

To add another application, choose **File > Settings > Editor**, select **Add other app**, then choose the application. Remove configured apps from the same screen.

## Application window controls

- Toggle fullscreen: `Ctrl+Cmd+F` on macOS or `F11` on Windows/Linux.
- In development builds, **View** also provides reload and developer tools.
