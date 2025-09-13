import type { ComponentChildren } from 'preact'

export function Button(props: { children?: ComponentChildren; onClick?: () => void; type?: 'button' | 'submit' | 'reset' }) {
  return (
    <button class="button" type={props.type ?? 'button'} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

