"use client";

import { useState } from "react";
import Image from "next/image";

export default function PropertyImagesEdit({ images = [] }) {
  // Existing Cloudinary URLs the user still wants to keep.
  // Seeded from props, so a page refresh restores anything removed here
  // that wasn't actually submitted.
  const [keptImages, setKeptImages] = useState(images);
  // Local previews for newly picked files (not yet uploaded).
  const [newPreviews, setNewPreviews] = useState([]);
  const [newCount, setNewCount] = useState(0);

  const removeExisting = (url) => {
    setKeptImages((prev) => prev.filter((u) => u !== url));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    setNewCount(files.length);
    setNewPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  // A property must always keep at least one image. If every existing
  // image is removed, force the user to add at least one new file.
  const needsNewImage = keptImages.length === 0;

  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-bold mb-2">Images</label>

      {keptImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {keptImages.map((url) => (
            <div key={url} className="relative">
              {/* Hidden input tells the server action which existing
                  images to keep. Removed ones simply aren't submitted. */}
              <input type="hidden" name="existingImages" value={url} />
              <Image
                src={url}
                alt="Property image"
                width={400}
                height={300}
                className="object-cover w-full h-28 rounded"
              />
              <button
                type="button"
                onClick={() => removeExisting(url)}
                aria-label="Remove image"
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {newPreviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {newPreviews.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="New upload preview"
              className="object-cover w-full h-28 rounded border-2 border-blue-400"
            />
          ))}
        </div>
      )}

      <input
        type="file"
        id="images"
        name="images"
        className="border rounded w-full py-2 px-3"
        accept="image/*"
        multiple
        required={needsNewImage && newCount === 0}
        onChange={handleFileChange}
      />
      {needsNewImage && newCount === 0 ? (
        <p className="text-sm text-red-500 mt-1">
          All images removed — you must add at least one image before saving.
        </p>
      ) : (
        <p className="text-sm text-gray-500 mt-1">
          Add new images or click the &times; on an image to remove it. Changes
          are saved when you update the property.
        </p>
      )}
    </div>
  );
}
