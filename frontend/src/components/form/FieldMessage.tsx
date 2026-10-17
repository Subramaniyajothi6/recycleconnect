import { Icon } from "../Icon";

/** The red message under a field, or a grey hint when there is no error. */
export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <span className="hint err" id={id} role="alert">
        <Icon name="alert" size={14} />
        {error}
      </span>
    );
  }
  return hint ? <span className="hint" id={id}>{hint}</span> : null;
}

/** The message at the top of a form when the API refuses it for a reason not tied to one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="note warn form-error" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
    </div>
  );
}
