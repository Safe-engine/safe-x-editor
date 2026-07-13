import { readFileSync } from "fs-extra";
import { last } from "lodash";
// SkeletonBinary cần một AttachmentLoader.
// Nếu bạn có .atlas, dùng AtlasAttachmentLoader kết hợp TextureLoader.
// Nếu chỉ muốn đọc cấu trúc (bones, slots, animations) và không care attachment textures,
// bạn có thể cung cấp một AttachmentLoader "stub" trả về placeholders.
// ---- Example: simple stub AttachmentLoader ----
export let loadSpineFile;
(async () => {
  const spine = await import('@esotericsoftware/spine-core');
  class StubAttachmentLoader {
    newRegionAttachment(skin, name, path) {
      // trả về object minimal; spine runtime có thể mong đợi Attachment class,
      // nhưng nếu bạn chỉ parse SkeletonData, nhiều runtime cho phép object đơn giản.
      const att = new spine.RegionAttachment(name, path);
      // Tạo region giả
      att.region = {
        u: 0, v: 0, u2: 1, v2: 1,
        width: 1, height: 1,
        degrees: 0,
        texture: null,
        offsetX: 0, offsetY: 0,
        originalWidth: 1,
        originalHeight: 1,
      };
      // Không gọi updateRegion() để tránh lỗi
      // hoặc dùng try/catch nếu runtime tự gọi
      try { att.updateRegion = () => { }; } catch (_) { }
      return att;
    }
    newMeshAttachment(name, path) {
      const att = new spine.MeshAttachment(name, path);
      try { att.updateRegion = () => { }; } catch (_) { }
      return att;
    }
    newBoundingBoxAttachment(skin, name) { return new spine.BoundingBoxAttachment(name); }
    newPathAttachment(skin, name) { return new spine.PathAttachment(name); }
    newPointAttachment(skin, name) { return new spine.PointAttachment(name); }
    newClippingAttachment(skin, name) { return new spine.ClippingAttachment(name); }
  }
  loadSpineFile = function (skeletonDataFile: string, atlasFile: string) {
    const realFile = decodeURIComponent(last(skeletonDataFile.split('.net/')));
    // console.log('skeletonDataFile', realFile);
    const attachmentLoader = new StubAttachmentLoader();
    if (skeletonDataFile.endsWith('.json')) {
      const skeletonJson = new spine.SkeletonJson(attachmentLoader);
      const json = readFileSync(realFile, 'utf-8');
      return skeletonJson.readSkeletonData(json);
    }
    const skeletonBinary = new spine.SkeletonBinary(attachmentLoader);
    const buffer = readFileSync(realFile);
    const skeletonData = skeletonBinary.readSkeletonData(new Uint8Array(buffer));
    // console.log('skeletonData', skeletonData);
    return skeletonData;
  };
})();
