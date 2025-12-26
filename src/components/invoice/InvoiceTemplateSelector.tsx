import { TemplateType, templateNames } from "./templates";
import { FileText, Layers, Receipt, Printer } from "lucide-react";

interface InvoiceTemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

const templateIcons: Record<TemplateType, React.ReactNode> = {
  classic: <FileText size={20} />,
  modern: <Layers size={20} />,
  minimal: <Receipt size={20} />,
  thermal: <Printer size={20} />,
};

export const InvoiceTemplateSelector = ({
  selectedTemplate,
  onSelectTemplate,
}: InvoiceTemplateSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(templateNames) as TemplateType[]).map((template) => (
        <button
          key={template}
          onClick={() => onSelectTemplate(template)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            selectedTemplate === template
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {templateIcons[template]}
          {templateNames[template]}
        </button>
      ))}
    </div>
  );
};
