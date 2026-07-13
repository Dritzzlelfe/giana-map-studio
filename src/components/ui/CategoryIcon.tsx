import {
  Armchair,
  Banknote,
  Bath,
  Blinds,
  Building2,
  ChefHat,
  ClipboardCheck,
  Compass,
  Droplets,
  Frame,
  Grid3x3,
  Hammer,
  Home,
  Lamp,
  Layers,
  Layout,
  Package,
  Palette,
  Paintbrush,
  Percent,
  Ruler,
  Sofa,
  Sparkles,
  Truck,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Category key → editorial Lucide icon.
// Keys tolerate the seed data ("plumbing", "tile", "millwork"…) plus mind-map
// coordination axes ("logistics", "budget"…). Fallback = Layers.
const ICONS: Record<string, LucideIcon> = {
  plumbing: Droplets,
  tile: Grid3x3,
  stone: Grid3x3,
  flooring: Layers,
  wood_floor: Layers,
  upholstery: Armchair,
  drapery: Blinds,
  window_treatment: Blinds,
  window_treatments: Blinds,
  lighting: Lamp,
  electrical: Zap,
  hardware: Wrench,
  kitchen: ChefHat,
  appliances: ChefHat,
  furniture: Sofa,
  ffe: Sofa,
  art: Frame,
  accessories: Sparkles,
  decor: Sparkles,
  millwork: Hammer,
  cabinetry: Hammer,
  carpentry: Hammer,
  paint: Paintbrush,
  finishes: Palette,
  bath: Bath,
  bathroom: Bath,
  plumbing_fixtures: Bath,
  hvac: Compass,
  structural: Building2,
  logistics: Truck,
  shipping: Truck,
  budget: Wallet,
  payments: Banknote,
  fees: Percent,
  approvals: ClipboardCheck,
  measurements: Ruler,
  layout: Layout,
  rug: Layers,
  rugs: Layers,
  packing: Package,
  rooms: Home,
};

export function iconForCategory(key: string | null | undefined): LucideIcon {
  if (!key) return Layers;
  const k = key.toLowerCase().trim();
  return ICONS[k] ?? Layers;
}

export function CategoryIcon({
  categoryKey,
  className,
  strokeWidth = 1.25,
}: {
  categoryKey: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = iconForCategory(categoryKey);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
