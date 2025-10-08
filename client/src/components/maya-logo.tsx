export function MayaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 dark:from-purple-400 dark:via-pink-400 dark:to-orange-300 bg-clip-text text-transparent">
          Maya
        </h1>
      </div>
    </div>
  );
}
