"use server";
import connectDB from "@/config/database";
import Property from "@/models/Property";
import { getSessionUser } from "@/utils/getSessionUser";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import cloudinary from "@/config/cloudinary";
import { geocodeLocation } from "@/utils/geocode";

// Derive the Cloudinary public id (incl. folder) from a secure_url.
function publicIdFromUrl(imageUrl) {
  const parts = imageUrl.split("/");
  const fileName = parts.at(-1).split(".").at(0);
  return "propertybazar/" + fileName;
}

async function updateProperty(propertyId, formData) {
  await connectDB();

  const sessionUser = await getSessionUser();

  if (!sessionUser || !sessionUser.userId) {
    throw new Error("User Id is required");
  }

  const { userId } = sessionUser;

  const existingProperty = await Property.findById(propertyId);

  // Verify ownership
  if (existingProperty.owner.toString() !== userId) {
    throw new Error("Current user does not own this property");
  }

  // Existing images the user chose to keep (hidden inputs from the form).
  const keptImages = formData.getAll("existingImages");
  // Newly selected files to upload.
  const newImages = formData
    .getAll("images")
    .filter((image) => image.name !== "" && image.size > 0);

  // A property must always have at least one image.
  if (keptImages.length === 0 && newImages.length === 0) {
    throw new Error("A property must have at least one image");
  }

  // Images present before but no longer kept -> delete from Cloudinary.
  const removedImages = existingProperty.images.filter(
    (url) => !keptImages.includes(url),
  );

  for (const url of removedImages) {
    await cloudinary.uploader.destroy(publicIdFromUrl(url));
  }

  // Upload the new images.
  const newImageUrls = [];
  for (const imageFile of newImages) {
    const imageBuffer = await imageFile.arrayBuffer();
    const imageArray = Array.from(new Uint8Array(imageBuffer));
    const imageData = Buffer.from(imageArray);
    const imageBase64 = imageData.toString("base64");

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBase64}`,
      {
        folder: "propertybazar",
      },
    );
    newImageUrls.push(result.secure_url);
  }

  const propertyData = {
    owner: userId,
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description"),
    location: {
      street: formData.get("location.street"),
      city: formData.get("location.city"),
      state: formData.get("location.state"),
      zipcode: formData.get("location.zipcode"),
    },
    beds: formData.get("beds"),
    baths: formData.get("baths"),
    square_feet: formData.get("square_feet"),
    amenities: formData.getAll("amenities"),
    rates: {
      nightly: formData.get("rates.nightly"),
      weekly: formData.get("rates.weekly"),
      monthly: formData.get("rates.monthly"),
    },
    seller_info: {
      name: formData.get("seller_info.name"),
      email: formData.get("seller_info.email"),
      phone: formData.get("seller_info.phone"),
    },
    images: [...keptImages, ...newImageUrls],
  };

  const addressChanged =
    propertyData.location.street !== existingProperty.location.street ||
    propertyData.location.city !== existingProperty.location.city ||
    propertyData.location.state !== existingProperty.location.state ||
    propertyData.location.zipcode !== existingProperty.location.zipcode;

  if (addressChanged) {
    const coords = await geocodeLocation(propertyData.location);
    if (coords) {
      propertyData.location.lat = coords.lat;
      propertyData.location.lng = coords.lng;
    }
  } else {
    propertyData.location.lat = existingProperty.location.lat;
    propertyData.location.lng = existingProperty.location.lng;
  }

  const updatedProperty = await Property.findByIdAndUpdate(
    propertyId,
    propertyData,
  );

  revalidatePath("/", "layout");

  redirect(`/properties/${updatedProperty._id}`);
}

export default updateProperty;
