import { useBrandImage } from "@/global-services/useBrandImage";

export function BrandBlock() {
  const brandImg = useBrandImage();

  return (
    <div className="brand-block items-center justify-end lg:justify-center">
      <div className="brandIcon">
        <img
          src={brandImg}
          alt="JAICE"
          className="object-cover w-20 md:w-22 lg:w-24 animate-element"
        />
      </div>
      <div
        className="brand-tag text-md md:text-xl lg:text-2xl whitespace-nowrap animate-element"
      >
        Simplify Your Job Hunt
      </div>
    </div>
  );
}
