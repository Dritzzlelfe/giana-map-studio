import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  title: string;
  descendantCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteNodeDialog({ open, title, descendantCount, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Delete this node?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-semibold text-foreground">{title}</span>
            {descendantCount > 0 ? (
              <>
                {" "}and its{" "}
                <span className="font-semibold text-destructive">
                  {descendantCount} descendant{descendantCount === 1 ? "" : "s"}
                </span>.
              </>
            ) : (
              <>.</>
            )}{" "}
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
