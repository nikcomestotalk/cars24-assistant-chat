import { Heart } from "lucide-react";

interface Car {
  id: number;
  name: string;
  year: number;
  km: number;
  fuel: string;
  price: number;
  image: string | null;
}

const formatPrice = (p: number) =>
  "₹" + (p / 100000).toFixed(2).replace(/\.00$/, "") + " L";

const formatKm = (km: number) => (km >= 1000 ? `${(km / 1000).toFixed(0)}k km` : `${km} km`);

export function CarCards({
  cars,
  shortlisted,
  onToggleShortlist,
}: {
  cars: Car[];
  shortlisted: number[];
  onToggleShortlist: (id: number) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex gap-3" style={{ width: "max-content" }}>
        {cars.map((car) => {
          const isShort = shortlisted.includes(car.id);
          return (
            <div
              key={car.id}
              className="flex w-[160px] flex-col overflow-hidden rounded-xl border border-border bg-card"
              style={{ height: 220 }}
            >
              <div className="h-[88px] w-full bg-muted" aria-hidden />
              <div className="flex flex-1 flex-col justify-between p-2.5">
                <div>
                  <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
                    {car.name}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {car.year} · {formatKm(car.km)} · {car.fuel}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-[14px] font-bold text-cars24-red">
                    {formatPrice(car.price)}
                  </div>
                  <button
                    type="button"
                    aria-label={isShort ? `Remove ${car.name} from shortlist` : `Shortlist ${car.name}`}
                    aria-pressed={isShort}
                    onClick={() => onToggleShortlist(car.id)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
                  >
                    <Heart
                      className={isShort ? "fill-cars24-red stroke-cars24-red" : "stroke-muted-foreground"}
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}