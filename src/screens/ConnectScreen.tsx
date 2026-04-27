import { motion } from 'motion/react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import ProfileAvatarMenu from '../components/ProfileAvatarMenu';
import { createConnectPost, getConnectPosts, ConnectPost } from '../services/backendService';
import { getCurrentUserId } from '../services/session';

function formatRelativeTime(dateString: string): string {
  const target = new Date(dateString).getTime();
  if (Number.isNaN(target)) {
    return dateString;
  }
  const diff = Date.now() - target;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function ConnectScreen() {
  const userId = getCurrentUserId();
  const [posts, setPosts] = useState<ConnectPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaMime, setMediaMime] = useState('');
  const [mediaData, setMediaData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = async () => {
    try {
      const data = await getConnectPosts(100);
      setPosts(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const handlePickMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Only image or video files are supported');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaData(String(reader.result || ''));
      setMediaType(isImage ? 'image' : 'video');
      setMediaMime(file.type);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setMediaType('none');
    setMediaMime('');
    setMediaData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const publish = async () => {
    if (!text.trim() && mediaType === 'none') {
      return;
    }

    setPublishing(true);
    setError('');
    try {
      await createConnectPost({
        user_id: userId,
        content_text: text.trim(),
        media_type: mediaType,
        media_mime: mediaMime,
        media_data: mediaData,
      });
      setText('');
      clearMedia();
      await loadPosts();
    } catch (e: any) {
      setError(e?.message || 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen pb-40 relative z-10 bg-background/50">
      <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/5">
        <div className="flex items-center justify-between px-8 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">waves</span>
            <h1 className="text-xl font-bold text-primary font-headline tracking-tight">PuffSqueeze Connect</h1>
          </div>
          <ProfileAvatarMenu userId={userId} sizeClassName="w-10 h-10" />
        </div>
      </header>

      <main className="pt-24 px-4 max-w-2xl mx-auto">
        <section className="mb-10 pt-4">
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">Mood Tree-hole</h2>
          <p className="text-on-surface-variant/80 text-sm font-medium">A sanctuary for your thoughts. Share what is in your heart.</p>
        </section>

        <section className="mb-12 bg-white/40 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 shadow-sm">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/50 bg-primary/10">
              <img className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-grow">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 outline-none text-lg font-medium placeholder:text-outline/50 p-0 min-h-[80px] resize-none"
                placeholder="What are you feeling right now?"
              />

              {mediaData !== '' && (
                <div className="relative mt-4 rounded-2xl overflow-hidden border border-white/20 bg-black/5">
                  {mediaType === 'image' ? (
                    <img src={mediaData} alt="Selected media" className="w-full max-h-72 object-cover" />
                  ) : (
                    <video src={mediaData} controls className="w-full max-h-72 object-contain bg-black" />
                  )}
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-black/55 text-white w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handlePickMedia}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl h-10 w-10 flex items-center justify-center hover:bg-white/40 transition-colors text-primary/70"
                    title="Add image or video"
                  >
                    <span className="material-symbols-outlined text-xl">perm_media</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={publishing || (!text.trim() && mediaType === 'none')}
                  className="bg-primary text-on-primary font-bold px-8 py-3 rounded-full disabled:opacity-50 transition-all text-sm"
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            </div>
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading posts...</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] overflow-hidden border border-white/20 bg-white/30 backdrop-blur-sm"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/50 bg-primary/10">
                      <img className="w-full h-full object-cover" src={post.author.avatar} alt={post.author.name} referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface text-sm">{post.author.name}</h3>
                      <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider">
                        {formatRelativeTime(post.published_at)}
                      </span>
                    </div>
                  </div>

                  {post.content_text && (
                    <p className="text-on-surface-variant text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                      {post.content_text}
                    </p>
                  )}

                  {post.media_type === 'image' && post.media_data !== '' && (
                    <div className="rounded-2xl overflow-hidden mb-2">
                      <img className="w-full object-cover max-h-[420px]" src={post.media_data} alt="Post media" />
                    </div>
                  )}

                  {post.media_type === 'video' && post.media_data !== '' && (
                    <div className="rounded-2xl overflow-hidden mb-2 bg-black">
                      <video className="w-full max-h-[420px]" src={post.media_data} controls />
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

