import type {ReactNode} from "react"
import type {Locator} from "@/shared/schema"

const ATTRIBUTE_CAP = 4

type ElementHeaderProps = {
  locator: Locator
  children?: ReactNode
}

/** Tag, selector and uniqueness flag: the one-line identity of the picked element. */
export function ElementHeader({locator, children}: ElementHeaderProps) {
  return (
    <div className="card-head">
      <code className="element-tag" translate="no">
        {locator.tag}
      </code>

      <code className="element-selector" title={locator.selector} translate="no">
        {locator.selector}
      </code>

      {locator.selectorUnique ? null : (
        <span
          className="element-flag"
          title="This selector matches more than one element"
        >
          Not unique
        </span>
      )}

      {children}
    </div>
  )
}

/** Compact DOM facts for the picked element, shared by the composer and the read card. */
export function ElementFacts({locator}: {locator: Locator}) {
  const attributes = Object.entries(locator.attrs)
  const shownAttributes = attributes.slice(0, ATTRIBUTE_CAP)
  const hiddenAttributes = attributes.length - shownAttributes.length
  const attributeTitle = attributes
    .map(([name, value]) => `${name}="${value}"`)
    .join("\n")
  const classes = locator.classes.map((name) => `.${name}`).join(" ")
  const ancestors = locator.ancestors.join(" › ")
  const width = Math.round(locator.rect.width)
  const height = Math.round(locator.rect.height)

  return (
    <dl className="element-facts">
      {locator.role ? (
        <div className="element-fact">
          <dt>Role</dt>
          <dd translate="no">{locator.role}</dd>
        </div>
      ) : null}

      <div className="element-fact">
        <dt>Size</dt>
        <dd className="tabular-nums">
          {width} × {height} px
        </dd>
      </div>

      {locator.text ? (
        <div className="element-fact">
          <dt>Text</dt>
          <dd className="element-fact__text" title={locator.text}>
            {locator.text}
          </dd>
        </div>
      ) : null}

      {classes ? (
        <div className="element-fact">
          <dt>Classes</dt>
          <dd className="element-fact__code" translate="no" title={classes}>
            {classes}
          </dd>
        </div>
      ) : null}

      {attributes.length > 0 ? (
        <div className="element-fact">
          <dt>Attributes</dt>
          <dd className="element-fact__chips" title={attributeTitle}>
            {shownAttributes.map(([name, value]) => (
              <span
                key={name}
                className="element-chip"
                translate="no"
                title={`${name}="${value}"`}
              >
                {name}="{value}"
              </span>
            ))}

            {hiddenAttributes > 0 ? (
              <span
                className="element-chip element-chip--more"
                translate="no"
                title={attributeTitle}
              >
                +{hiddenAttributes}
              </span>
            ) : null}
          </dd>
        </div>
      ) : null}

      {ancestors ? (
        <div className="element-fact">
          <dt>Ancestors</dt>
          <dd className="element-fact__code" translate="no" title={ancestors}>
            {ancestors}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
