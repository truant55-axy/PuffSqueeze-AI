import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, AudioLines, BarChart3, BookOpen,
  BookmarkCheck, BookmarkPlus, Brain, Cable, Check, ChevronLeft,
  ChevronRight, Circle, CircleDot, CirclePause, CirclePlus, Croissant,
  Download, Droplet, Fish, Gamepad2, Hand, Heart, History, House,
  Image, Images, Info, Languages, Leaf, Lock, LockOpen, Mail,
  MailOpen, MailPlus, Maximize, MessageCircle, Minimize, Moon,
  MoreHorizontal, MousePointerClick, NotebookPen, Pause, Pencil,
  Plane, Play, RefreshCw, Salad, Send, SlidersHorizontal, Sparkles,
  Sprout, Star, Trash2, TrendingUp, Unlink, User, Users, Utensils,
  Volume2, VolumeX, Waves, Wind, X,
  type LucideIcon,
} from 'lucide-react';

// Keep existing icon names and styling hooks; every drawing ships with the app.
const symbols: Record<string, LucideIcon> = {
  add_circle: CirclePlus, air: Wind, analytics: BarChart3,
  arrow_back: ArrowLeft, arrow_back_ios_new: ChevronLeft,
  auto_awesome: Sparkles, auto_stories: BookOpen, back_hand: Hand,
  bakery_dining: Croissant, bedtime: Moon, bookmark_add: BookmarkPlus,
  bookmark_added: BookmarkCheck, bubble_chart: CircleDot, cable: Cable,
  chevron_right: ChevronRight, close: X, cottage: House, delete: Trash2,
  description: NotebookPen, done: Check, download: Download, drafts: MailOpen,
  eco: Leaf, edit: Pencil, edit_note: NotebookPen, equalizer: AudioLines,
  favorite: Heart, flight: Plane, forum: MessageCircle, fullscreen: Maximize,
  fullscreen_exit: Minimize, grass: Sprout, group: Users, groups: Users,
  history: History, home_max: House, image: Image, info: Info,
  insights: TrendingUp, link_off: Unlink, lock: Lock, lock_open: LockOpen,
  mail: Mail, mark_email_unread: MailPlus, menu_book: BookOpen,
  more_horiz: MoreHorizontal, north: ArrowUp, nutrition: Salad,
  outgoing_mail: Send, pause: Pause, pause_circle: CirclePause,
  perm_media: Images, person: User, phishing: Fish, play_arrow: Play,
  psychology: Brain, refresh: RefreshCw, restaurant: Utensils, send: Send,
  south: ArrowDown, sports_esports: Gamepad2, stars: Star,
  touch_app: MousePointerClick, translate: Languages, tune: SlidersHorizontal,
  volume_off: VolumeX, volume_up: Volume2, water: Waves, water_drop: Droplet,
  waves: Waves,
};

type AppIconProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & { children: ReactNode };

export default function AppIcon({ children, className = '', ...props }: AppIconProps) {
  const name = typeof children === 'string' ? children.trim() : '';
  const Glyph = symbols[name] ?? Circle;
  return <span {...props} className={`app-icon ${className}`} aria-hidden={props['aria-hidden'] ?? true}>
    <Glyph width="1em" height="1em" strokeWidth={2} aria-hidden="true" focusable="false" style={{ display: 'block', width: '1em', height: '1em', minWidth: '1em', flexShrink: 0, overflow: 'visible' }} />
  </span>;
}
