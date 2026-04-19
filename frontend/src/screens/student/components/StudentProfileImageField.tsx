import { Camera, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/Button";
import { getDisplayInitials } from "../../../utils/profileImage";

type StudentProfileImageFieldProps = {
  name: string;
  profileImageUrl: string | null;
  onSelectImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
};

export function StudentProfileImageField({
  name,
  profileImageUrl,
  onSelectImage,
  onRemoveImage,
}: StudentProfileImageFieldProps) {
  return (
    <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="h-16 w-16 border theme-border">
          {profileImageUrl ? <AvatarImage src={profileImageUrl} alt={name} /> : null}
          <AvatarFallback className="text-sm font-semibold text-[var(--app-text)]">
            {getDisplayInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-[var(--app-text)]">Profile picture</p>
          <p className="text-xs theme-muted">Used in your classroom and submission views.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={onSelectImage}
          />
          <span className="theme-ring inline-flex h-9 items-center rounded-lg border theme-border px-3 text-sm text-[var(--app-text)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]">
            <Camera className="mr-2 h-4 w-4" />
            Upload
          </span>
        </label>

        {profileImageUrl && (
          <Button type="button" variant="outline" size="sm" onClick={onRemoveImage}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
