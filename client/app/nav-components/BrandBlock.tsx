import { useBrandImage } from "@/global-services/useBrandImage";

export function BrandBlock() {
  const brandImg = useBrandImage();

  return (
    <div className="brand-block items-center justify-end lg:justify-center gap-2">
      <div className="brandIcon">
        <img
          src={brandImg}
          alt="JAICE"
          className="object-cover w-16 md:w-20 lg:w-24 animate-element"
        />
      </div>
      <div
        className="brand-tag text-lg md:text-xl lg:text-2xl animate-element"
      >
        Simplify Your Job Hunt
      </div>
    </div>
  );
}
