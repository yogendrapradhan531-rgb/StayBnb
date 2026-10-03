/** Inline error message under a form field (linked via aria-describedby). */
export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <small id={id} className="field-error" role="alert">
      {message}
    </small>
  );
}

/** Props to spread on an input so screen readers announce its error. */
export const errorProps = (errors, name) =>
  errors[name]
    ? { 'aria-invalid': true, 'aria-describedby': `${name.replace(/\W/g, '-')}-error`, className: 'input-error' }
    : {};

export const errorId = (name) => `${name.replace(/\W/g, '-')}-error`;
