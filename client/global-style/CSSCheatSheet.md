# Global CSS Reference & Selector Cheat Sheet

### **A Consolidated Guide for Our Team**

This document was created with the help of ChatGPT to summarize, consolidate, and clarify how CSS selectors, rules, and common styling patterns work. It blends technical explanations with practical demonstrations to show how different selectors behave and how styles are actually applied in real layouts. It's written in a manner that assumes no deep knowledge and focuses on the core foundation of CSS.

While it isn’t intended to be a fully exhaustive reference, it provides a solid foundation for understanding the CSS cascade, specificity, selector choice, and common styling conventions. The goal is to offer a clear, easily searchable guide (ctrl + f) for deciding which selector to use, how rules interact, and how to apply foundational properties correctly.

Many sections include adapted examples and expanded explanations to make concepts easier to understand — especially for those who learn best by seeing how things work in context. This should serve as both a learning resource and a reference when building out or maintaining our global CSS stylesheet.

## **_How CSS Decides Which Rule Wins_**

CSS follows a predictable set of rules that determine which styles actually get applied when multiple selectors target the same element.

CSS assigns weights to different types of selectors at different levels. These weights determine what wins in a conflict: heavier selectors override lighter ones. Higher priority selectors our rule lower priority selectors.

**_After reading this guide, you should have a solid understanding of how CSS applies rules to elements and how those elements are weighed across different levels. Once you learn it, it's universal everywhere CSS is supported._**

Quick Reference:

    C < B < A < inline styles < !imporant

    "This will make sense in a moment."

### **1. Specificity**

CSS specificity uses a numeric system often represented as:

A-B-C or 0-0-0

A = IDs  
B = Classes, pseudo-classes, and attribute selectors  
C = Elements and pseudo-elements

When determining weights we sum the totals at each level to determine the specificity of the rule with the higher total weights taking priority over lesser weights. This is explain in detail in section 1.3, with subsequent section detailing exceptions to the primary weights rule.

_Always remember that specificity picks the highest weight, and when weights are equal, the lowest implementation wins (lowest in the css file) with the exception of inline styles and the !important tag._

### **Specificity strength (low -> high)**

#### _1.1 Element selectors (C)_

    Base weight: 0-0-1

    These contribute one element-level unit
    Lowest specificity
    Good for base styling

    Examples:
        a {...}             0-0-1 -> element
        button {...}        0-0-1 -> element
        h2 {...}            0-0-1 -> element
        div {...}           0-0-1 -> element

#### _1.2 Classes, attributes, pseudo-classes (B)_

    Base weight: 0-1-0

    These all count as one class-level unit
    Higher than elemens, same tier among themselves

    Examples:
        .btn {...}              0-1-0 -> class
        [disabled] {...}        0-1-0 -> attribute
        :hover {...}            0-1-0 -> pseudo-class
        :focus {...}            0-1-0 -> pseudo-class

#### _1.3 Combined selectors(C + B)_

    Base weight: Combined sum of all parts

    Specificity grows as you add more parts

    Examples:
        a.btn {...}
            a                   0-0-1 -> element unit
            .btn                0-1-0 -> class unit

        a.btn{...}              0-1-1 -> class and element units combined

        .card:hover {...}
            .card               0-1-0 -> class unit
            :hover              0-1-0 -> class unit

        .card:hover{...}        0-2-0 -> class units combined

        .card h2 {...}
            .card               0-1-0 -> class unit
            h2                  0-0-1 -> element unit

        .card h2 {...}          0-1-1 -> class and element units combined

#### _1.4 IDs(A)_

    Base Weight: 1-0-0

    IDs contribute one ID-level unit, which heavily outweighs classes and elements

    IDs override anything except inline styles and !important

    IDs < inline style < !imporant

    Examples:
        #main-content {...}         1-0-0 -> ID unit

#### _1.5 Inline styles_

    Base weight: 1-0-0

    Technically comparable to ID-level weight

    selector based rules (A-B-C) < inline style < !important

    Examples:
        button {
            color: blue;                0–0–1 → element
        }

        <button style="color: red;">    1-0-0 → inline style
                Click Me
        </button>

    Inline styles carry a priority weight equivalent to 1–0–0, which places them above all selector-based rules (elements, classes, pseudo-classes, combinators, and even most ID selectors).

    Because of this, any selector rule with A–B–C specificity will be overridden if an inline style sets the same property.

    Inline styles outrank selector-based rules because they are applied directly to the element at the document level, giving them higher priority than any CSS rule declared in a stylesheet.

#### _1.6 !important (avoid whenever possible)_

    Overrides all weights

    Specificity does not matter and !import wins
    unless another !important with higher specificity challenges it.

    In which case, the lowest !important tag wins (lowest in the file)

    Example:
        a { 
            text-decoration: none !important;
        }

### **2. Order**

If the specificity of two rules is equal, the rule written lower in the file wins, with the execption of inline styles, or a specific attribute having the !important tag.

    C < B < A < inline styles < !important

- CSS applies rules based on **A-B-C** specificity weights
- **Inline styles** override **A-B-C** rules.
- **!important** overrides **Inline styles** and **A-B-C** rules for specific attributes.
- If two attributes are marked with **!important**, the **A-B-C** rule with the higher weighted specificity will be applied.

### **3. Matching**

A rule only matters if the element actually matches or uses it.

Examples:

    :hover does not apply to disabled elements

    a.primary applies to <a class="primary">, not <button>

    input::placeholder styles placeholder text only

## **_Selector Types and When to Use Them_**

Each section uses the following structure:

- Example
- Meaning
- Notes
- When to choose this

## **_Element Selectors_**

### **Example Code**

    a {
        color: var(--primary-one);
    }

    button {
        border-radius: 20px;
    }

### **Meaning**

Targets every instance of that HTML tag across the entire application.

### **Notes**

- Lowest specificity
- Best for establishing universal defaults.
- Avoid heavy styling here, keep it foundational
- Defines the placement of internal elements
- Does not define it's placement within a parent element

### **When to Choose This**

Use when you want **all elements** of a type to share a base look:

- All buttons have the same padding
- All links share the same initial color
- All inputs have consistent borders

Should define a global standard for the element. If we want all buttons to follow a standard look, we apply it here. Then we can override the button with a class selector to define specific use case styles for the buttons.

These elements should be written in a manner that makes it easy to override with a class selector.

## **_Class Selectors_**

### **Example Code**

Element Selector

    button {                        0-0-1 -> element unit
        padding: 1rem 2rem;
    }

Class Selector

    .button-small {                 0-1-0 -> class unit
        padding: 0.5rem 1rem;
    }

    .shadow {                       0-1-0 -> class unit
        box-shadow: var(--shadow);
    }

Example Implementation

    <button className="button-small">
        Some Button
    </button>

This example demonstrates using a class selector to override the element selector.

### **Meaning**

Applies the defined attributes in the class selector to the element that calls the defined class. This will override attributes defined with element selector rules.

### **Notes**

- Class selectors have higher specificity than element selectors.
- Great for reusable UI components and utility classes.
- Parent container controls shape and space of the element (width, height, layout placement, margin)
- Class selector controls internal structure and behavior (padding, alignment, internal layout, visual rules, internal margin).

This keeps the component consistent no matter where it’s placed.

### **When to Choose This**

Use a class selector when:

- A style or visual pattern needs to be reused in multiple contexts.
- You are overriding base element defaults with a consistent higher-level rule.
- You want the parent to decide how big the component is, and the component itself to decide how it behaves internally.
- You want predictable, composable, layout-friendly components where size is external and behavior is internal.
- You want repeatable patterns applied for a specific element across specific conditions
- Example uses:
  - Box shadows
  - Cards
  - Button variations
  - Hover interactions

## **_Combined Selectors_**

### **Example Code**

Combined Selectors

    a.nav-link {
        font-weight: 600;
    }

    button.primary {
        padding: 0.6rem 1.2rem;
    }

Implementaion

    <a className="nav-link">
    <button className="primary">

### **Meaning**

Applies attributes when the base element and className style are set on the implementation. This allows us to style elements based on combined elements/classes.

### **Notes**

- More specific than either selector alone.
- Useful for component-level consistency

### **When to Choose This**

Use a combined selector when:

- You want to style a particular class only when used on a certain tag
- You want to guarantee semantic accuracy (e.g., style only anchor-links, not button links)

Avoid if the class should be tag agnostic.

    This will not apply properly because primary is defined in combination with the button element.

        <a className="primary">

    Primary would have to be lowered to a class selector:

        .primary { ... }

## **_Combinators_**

Combinators define relationships between elements, allowing you to target elements based on how they're nested or positioned relative to each other.

Combinator Combinations:

    X           The first element or class
    Y           The second element or class

    X Y {...}       Descendant
    X > Y {...}     Child Combinator
    X + Y {...}     Adjacent Sibling Combinator
    X ~ Y {...}     General Sibling Combinator

### **Example Code**

#### _Defined Elements for examples below_

**Button One**: With a direct child (span) and grandchild (img)

    <button className="btn">
        <span>
            <img className="icon" src="/icon.svg"/>
        </span>
    </button>

**Button Two**: With a direct child (img)

    <button className="btn">
        <img className="icon" src="/icon.svg"/>
    </button>

**External Img**: An img element

    <img className="icon" src="/icon.svg"/>

#### _Descendant Combinator (X Y)_

"Apply the style to **Y** whenever it is **nested anywhere inside** of **X**."

**_Y is nested anywhere inside of X_**

    .btn .icon {
        filter: some values;
    }

    Assuming this implementation

    <>
        <Button One />
        <Button Two />
        <External Icon />
    </>

    The combinator (.btn .icon) will impact both Buttons. Depth of the relationship doesn't matter. All that matters is the .icon class is applied inside of the .btn class.

    It will not impact the External Img becuase it's not nested within an element that applies the .btn class.

#### _Child Combinator (X > Y)_

"Apply the style to **Y** only when it is a **direct child** of **X**."

**_Y is a direct child of X_**

    .btn > .icon {
        filter: brightness(0) invert(1);
    }

    Assuming this implementation

    <>
        <Button One />
        <Button Two />
        <External Icon />
    </>

    The combinator (.btn > .icon) will only impact Button Two because the .icon class is applied in an element that's a direct child of the .btn class.

    It will not impact the External Image icon because the External Image element isn't not nested as a direct child to an element that declared the .btn class.

#### _Adjacent Sibling Combinator (X + Y)_

"After **X** appears, apply the style to the **Y** that comes immediately after it as a sibling in the same parent."

**_X then Y_**

    .btn + .icon {
        margin-left: 0.5rem;
    }

    Assuming this implementation

    <>
        <Button One />
        <Some Element />
        <External Icon One>
        <Button Two />
        <External Icon Two/>
    </>

    This combinator will only impact External Icon Two becuase it's declared IMMEDIATELY after button two.

    External Icon One will not have the rule applied becuase there is an element nested between Button One and External Icon One.

#### _General Sibling Combinator (X ~ Y)_

"After **X** appears, apply the style to every **Y** that comes later as a **sibling** in the same parent."

**_X then every Y_**

    .btn ~ .icon {
        opacity: 0.5;
    }

    Assuming this implementation

    <>
        <Button One />
        <SomeElement />
        <SomeElement />
        <SomeElement />
        <ExternalIcon />      // icon #1
        <SomeElement />
        <ExternalIcon />      // icon #2
    </>

    This combinator (.btn ~ .icon) will apply to every element that appears as a sibiling after Button One, no matter how many elements sit between them.

### **Meaning**

Targets elements based on structural relationship. This is useful for defining styles that apply on combinations of elements and classes such as icons and buttons.

### **Notes**

- Adds specificity due to additional segments.
- Should remain predictable and not too deep.

### **When to Choose This**

Use when styling depends on layout or position:

- Headings inside cards
- Icons inside buttons
- Specific children of wrappers

Avoid if a class would be cleaner or the class needs to be applied across all elements.

This functionality can create powerful combinations that significantly improve consistency across the program and reduce boiler plate code.

## **_Pseudo-Classes_**

### **Example Code**

    a:hover {
        text-decoration: underline;
    }

    button:disabled {
        opacity: 0.6;
    }

    input:focus {
        border-color: var(--accent);
    }

### **Meaning**

Pseudo-classes let you style an element based on its state, interaction, or position — things that aren’t visible in the HTML structure itself.

    <button disabled={conditional argument (fields not filled out)}>
        Submit
    </button>

### **Notes**

- Same specificity as classes so order takes priority **(lowest in file wins)**
- Disabled elements cannot be hovered or focused

### **When to Choose This**

Use for:

- Interaction states (hover, active, focus)
- Form states (valid, invalid)
- Availability states (disabled)

Psuedo classes have far more examples than listed above and are a powerful set of tools that we can use to apply styles to elements based on various factors such as interactions, validation, position, state, browser history, focus, and more.

## **_Pseudo-Elements_**

### **Example Code**

    button::before {
        content: "";
        display: block;
    }

    input::placeholder {
        color: var(--text-muted);
    }

### **Meaning**

Pseudo-elements let you style parts of an element that don’t exist as actual HTML nodes. They’re perfect for decorative effects, injected content, or targeting specific text portions.

- ::before -> Creates a virtual element before the button's real content. Useful for icons, badges, decorative shapes, and background effects.

- ::placeholder -> Targets the placeholder text inside an input without affecting the actual value.

### **Notes**

- Used for decoration or supplemental content.
- Cannot be interacted with like actual HTML children

### **When to Choose This**

Use for:

- Icons placed via CSS
- Decorative backgrounds
- Placeholder text styling
- Content markers (badges, arrows)

Pseudo-elements offer a powerful way to style portions of an element that don’t exist directly in the HTML, giving you fine-grained control over content, text, and decorative visuals. They allow you to inject generated content, target specific text segments, style markers, customize placeholders, and more — all without adding extra DOM elements.

## **_ID Selectors_**

ID selectors are unique selectors designed for one-of-a-kind elements. They sit high on the specificity scale and override most other selector types, which makes them powerful but also restrictive in scalable systems.

### **Example Code**

    #main-content {
        max-width: 1200px;
    }

    #sidebar {
        position: fixed;
        left: 0;
        top: 0;
    }

    #hero-section {
        background: url('/hero.png') center/cover no-repeat;
    }

    #skip-to-content {
        position: absolute;
        top: -1000px;
    }

    #modal-root {
        isolation: isolate;
    }

Implementation

    <div id="main-content"/></div>

    <aside id="sidebar"></aside>

    <section id="hero-section"></section>

    <div id="modal-root"></div>

    <a href="#main-content" id="skip-to-content">
        Skip to Content
    </a>

### **Meaning**

ID selectors target one specific, unique element identified by its id="" attribute. IDs create a one-of-one identity within the page, allowing you to anchor links, reference elements in JavaScript, associate form labels and controls, and define page-level layout regions.

### **Notes**

- Very high specificity — significantly stronger than classes and elements
- Difficult to override without resorting to double selectors or !important
- IDs must be unique — only one per page
- Useful for document structure and accessibility
- Not reusable in components, lists, or repeatable UI patterns
- Modern systems avoid using IDs for styling because of their override strength

### **When to Choose This**

Use an ID selector when the element is truly one-of-a-kind and serves a structural or semantic purpose:

- Page-level layout regions (e.g., #header, #main, #footer)
- Jump links / anchor navigation
- JavaScript hooks (document.getElementById(...))
- Portal roots for modals, toasts, overlays
- ARIA relationships (aria-labelledby, aria-describedby)
- Skip-navigation links for accessibility

Avoid using ID selectors when:

- The UI element may appear more than once
- You’re styling reusable components
- You need flexible overrides or variants
- You want predictable design-system behavior
- A class can do the job more cleanly and consistently

Why You Usually Avoid IDs in Styling

- Because of their high specificity, ID selectors can easily “win” over class-based architecture. This creates:
- Hard-to-override styles
- Inconsistent UI behavior
- Style “fights” that force devs into hacks
- Inflexible components

IDs are excellent for structure, but poor for design systems.

## **_Universal Selector_**

The universal selector (\*) targets every element in the document.

It’s a precision tool for global resets and normalization — not for styling patterns or reusable components. When declared it's applied globally.

### **Example Code**

    * {
    box-sizing: border-box;
    }

    *,
    *::before,
    *::after {
        margin: 0;
        padding: 0;
    }

### **Meaning**

The universal selector applies rules to every element, regardless of type, class, or position. It’s a blanket application used to create consistent baseline behavior across your entire UI.

### **Notes**

- Very low specificity (lower than elements, classes, or IDs)
- Ideal for resets, normalization, and foundation-level defaults
- Should never carry heavy layout or visual styling — doing so creates global mess
- Avoid using it as a styling shortcut (it defeats the purpose of controlled design systems)
- Often paired with pseudo-elements (_::before, _::after) for full-reset coverage

### **When to Choose This**

Use the universal selector when:

- You need a global baseline (e.g., box-sizing: border-box)
- You’re applying a CSS reset or normalizing behavior
- You want to ensure all elements begin from the same consistent starting point
- You need to zero out margins, padding, or inherited quirks before adding design-specific styles

Avoid the universal selector when:

- Styling reusable components
- Adjusting layout or spacing
- Applying theme or color rules
- You need fine control over which elements are impacted

The universal selector is powerful — use it like the foundation pour of a building:

Once it’s set, everything else sits on top of it.

## **_When to use What_**

### **Use an Element Selector when:**

    The style should apply everywhere (global defaults)

    You want low specificity so components can override

        button {
            some style
        }

        <button>
            Some Button
        </button>

### **Use a Class Selector when:**

    The style is reusable

    You need a named styling pattern

    The style is used by multiple components

        .button-primary {
            some style
        }

        <button className="button-primary">
            Some Button
        </button>

### **Use a Combined Selector when:**

    Only a specific element/class combination should receive styling

    You need slightly more specificity without increasing complexity

    button.primary {
        some style
    }

    <button className="primary">
        Some Button
    </button>

### **Use a Combinator when:**

    Styling depends on the DOM structure

    You need to target children or nested elements

    button .button-icon {
        some style for icon classes nested in buttons
    }

    <button>
        <img className="button-icon">
        </img>
    </button>

### **Use Pseudo-Classes when:**

    Styling depends on interaction or state

    button:hover {
        some style for when the user is hovering over a button
    }

    button:disabled {
        some style for when the button is diabled
    }

    <button disabled={some condition that cycles disabled state}>
        Some button
    </button>

    * Note the hover state is automatically handled and doesn't need explicitly defined when declaring the button. (CSS handles the interaction) Additional functionality can be layered in using the elements onMouseEnter, onMouseExit.

### **Use Pseudo-Elements when:**

    You need decorative or supplemental content controlled via CSS

    input::placeholder {
        some style for the placeholder content (gray text)
    }

    <input placeholder={some placeholder value}>

    </input>

## **_Common CSS Property Syntax Reference_**

### **Border**

#### _Syntax_

    border: <width> <style> <color>

#### _Examples_

    border: 1px solid #333;
    border: 2px dashed var(--accent);
    border-bottom: 3px solid rgba(0,0,0,0.2);
    border: 1px solid rgba(var(--accent), 0.8);

#### _Values_

    width: px, rem
    style: solid, dashed, dotted, none
    color: hex, rgb, rgba, hsl, variable

### **Box Shadow**

#### _Syntax_

    box-shadow: <x-offset> <y-offset> <blur> <spread> <color>;

#### _Examples_

    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.15);
    box-shadow: 0px 4px 8px 0px rgba(var(--some-rgb-color), 0.9);

#### _Values_

    x-offset: left/right movement
    y-offset: up/down movement
    blur: how soft the shadow is
    spread: how large the shadow grows outward
    color: rgba recommended

### **Linear Gradient**

#### _Syntax_

    background: linear-gradient(
        <angle>,
        <color> <stop>,
        <color> <stop>
    );

#### _Example_

    background: linear-gradient(
        180deg,
        #ffffff 30%, -> Full white at 30% blend from this point
        #000000
    )

    background: linear-gradient(
        270deg,
        #ffffff,
        #000000
    )

    background: linear-gradient(
        30deg,
        var(--some-color),
        #000000,
        var(--some-other-color),
        #000000,
        #ffffff,
        #000000
    )

You can add as many colors as you want, just be sure the last color doesn't have a comma afterward to avoid issues.

#### _Values_

    angle: degress or direction (to right)
    color: any valid css color
    stop: the percentage where the color is peak. (blends outward from the defined stop)

### **calc()**

#### _Syntax_

    width: calc(<value> <op> <value>);

#### _Examples_

    width: calc(100% - 2rem);
    padding: calc(0.5rem + 4px);
    height: calc(50vh - 80px);

#### _Values_

    value: pct, rem, px, vh, any supported css value
    op: +, -, *, / standard operands

## **_CSS Units Overview_**

### **Absolute Units**

- px: pixel
- cm, mm, in: rarely used

### **Relative Units**

- rem: relative to root font size
- em: relative to elements font size
- %: percent of parent
- vw: viewport width
- vh: viewport height
- vmin/vmax: min/max of viewport dimensions

Use rem for consistent spacing and sizing

## **_Theme & Variable Usage Best Practices_**

- Prefer CSS variables whenever styling should change across:
  - Light/Dark mode
  - Contrast settings
  - User accessibility preferences
- Do not hardcode colors unless intentional
- Variables allow components to automatically adapt with no extra component code.

## **_Adding New Global Rules_**
Global rules should strengthen your design system, not clutter it.
Add them when they improve consistency, reduce duplicate code, and make UI behavior more predictable across the project.

### **Add a new rule if:**

- The style is used repeatedly (3+ places)
- The pattern is truly reusable across many components
- It improves system-wide consistency
- It uses theme variables or contributes to your visual language
- It represents a foundational behavior
- It reduces the need to restyle the same pattern in multiple files

### **Avoid adding when:**

- The style is one-off or specific to a single component
- It adds unnecessary specificity to the cascade
- It duplicates an existing rule, utility, or component-level style
- It introduces overrides that make component behavior harder to predict
- It solves a temporary or experimental design need
- The class is too narrow, too specific, or only used in niche cases
