/**
 * Icon set (plan F8) — re-exported from lucide-react under the project's
 * historical `*Icon` names so every existing call site keeps working unchanged.
 * Only the multicolor Google brand mark stays hand-rolled (lucide has no brand
 * marks).
 */
import type { SVGProps } from "react";

export type { LucideProps as IconProps } from "lucide-react";

export {
  ArrowLeft as ArrowLeftIcon,
  ArrowUpDown as SortIcon,
  Braces as CodeIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Copy as CopyIcon,
  Database as DatabaseIcon,
  Download as DownloadIcon,
  EllipsisVertical as MoreVerticalIcon,
  ExternalLink as ExternalLinkIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Globe as GlobeIcon,
  History as HistoryIcon,
  Image as ImageIcon,
  Key as KeyIcon,
  LayoutDashboard as LayoutIcon,
  LayoutGrid as GridIcon,
  Link2 as LinkIcon,
  List as ListIcon,
  Loader2 as SpinnerIcon,
  Lock as LockIcon,
  LogOut as SignOutIcon,
  Monitor as SystemIcon,
  Moon as MoonIcon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  RotateCcw as RestoreIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Share2 as ShareIcon,
  Sparkles as SparklesIcon,
  Sun as SunIcon,
  Trash2 as TrashIcon,
  TriangleAlert as AlertIcon,
  X as XIcon,
} from "lucide-react";

/** Google "G" — multicolor brand mark (fill-based, ignores stroke). */
export function GoogleIcon({
  size = 20,
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
