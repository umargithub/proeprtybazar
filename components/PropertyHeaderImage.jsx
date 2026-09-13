import Image from "next/image";

export default function PropertyHeaderImage({ image }) {
  if (!image) return null;

  return (
    <section>
      <div className="container-xl m-auto">
        <div className="grid grid-cols-1">
          <Image
            src={image}
            alt="Header Image"
            className="object-cover h-100 w-full"
            width={0}
            height={0}
            sizes="100vw"
          />
        </div>
      </div>
    </section>
  );
}
