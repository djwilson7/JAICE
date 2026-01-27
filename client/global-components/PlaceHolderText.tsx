// A simple component that renders placeholder text for demonstration purposes.
// Intended for the info modal, we can expand it's functionality to make it more dynamic.
// For instance being able to control the number of paragraphs, or being able to pull the text independent of the component.
// import { localfiles } from "@/directory/path/to/localimport";
const placeHolderText = [
  "At the very basic level, the info modal can contain paragraphs of text that describe visual elements and functionality on a specific page as demonstrated here. This modal is designed to remain insight until the user toggles it away so they can use the information as a reference while interacting with the page.",
  "This placeholder text can be used to explain more complex features, like an icon-only control bar. Instead of cluttering the page with labels, the info modal can provide a clear breakdown of each icon's function, explaining its purpose and the type of information it displays. This helps users quickly understand the different options available to them, like whether an alert icon is for quick status updates or account-related notifications.",
  "Info modals can also be used to explain interactive elements and user workflows. For example, you can describe how a user can drag and drop cards between columns on a dashboard, providing step-by-step instructions for getting the most out of the experience. This detailed guidance ensures users can easily navigate and utilize the page's full functionality.",
  "For more technical or advanced features, the info modal can act as a detailed guide. It can explain the purpose of multi-select options, as well as the functionality of various filter and search settings. This ensures that even users who are new to the platform can quickly become proficient with its features.",
  "The info modal is also a great place to provide context and background information. For instance, you can use it to explain the data sources for a chart, the last time a page was updated, or the meaning of specific color codes. This helps build user confidence and a deeper understanding of the content they're viewing.",
  "Finally, an info modal can be used to display crucial, non-blocking information. This might include a brief message about system maintenance, a heads-up about a new feature that's been added, or a quick reminder about a user's account status. It provides a way to communicate important details without forcing a user to leave the current page.",
  "Info modals can be a powerful tool for improving user experience and reducing confusion. By providing clear, concise, and contextual information, they help users understand and interact with your application more effectively.",
  "No I didn't type all of this out. :)",
];

export function PlaceHolderContent() {
  return (
    <div className="flex flex-col text-left gap-4 p-4">
      {placeHolderText.map((text, index) => (
        <div key={index} className="gap-4">
          <p>{text}</p>
        </div>
      ))}
    </div>
  )
}