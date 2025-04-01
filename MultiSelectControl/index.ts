import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class MultiSelectControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    // Private properties
    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _mainContainer: HTMLDivElement;
    private _unorderedList: HTMLUListElement;
    private _errorLabel: HTMLLabelElement;
    private _guidList: string[] = [];
    private _entityName = ""; // Type inferred as string
    private _fieldName = "";  // Type inferred as string
    private _notifyOutputChanged: () => void;

    /**
     * Constructor.
     */
    constructor() {
        // Default initialization of properties
        this._entityName = "";
        this._fieldName = "";
    }

    /**
     * Initialize the control instance.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._context = context;
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;

        // Create main container elements
        this._mainContainer = this.createStyledElement("div", ["multiselect-container"]);
        this._unorderedList = this.createStyledElement("ul", ["ks-cboxtags"]);
        this._errorLabel = this.createStyledElement("label", ["error-label"]);

        // Validate and set entity and field names
        this._entityName = this.getSafeString(context.parameters.entityName.raw);
        this._fieldName = this.getSafeString(context.parameters.fieldName.raw);

        // Fetch and render records
        const filter = `?$select=${this._fieldName},${this._entityName}id`;
        context.webAPI
            .retrieveMultipleRecords(this._entityName, filter)
            .then((result) => this.renderRecords(result.entities))
            .catch((error) => this.handleError(error));

        // Append elements to the DOM
        this._mainContainer.appendChild(this._unorderedList);
        this._mainContainer.appendChild(this._errorLabel);
        this._container.appendChild(this._mainContainer);
    }

    /**
     * Called when any value in the property bag changes.
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        if (this._context.parameters.fieldValue.formatted) {
            this._guidList = this._context.parameters.fieldValue.formatted.split(",");
        }
    }

    /**
     * Returns the current output values of the control.
     */
    public getOutputs(): IOutputs {
        return {
            fieldValue: this._guidList.join().replace(/^,/, ""),
        };
    }

    /**
     * Cleanup resources before the control is removed from the DOM.
     */
    public destroy(): void {
        // No explicit cleanup needed
    }

    /**
     * Handles checkbox change events.
     */
    public checkBoxChanged(evnt: Event): void {
        const targetInput = evnt.target as HTMLInputElement;
        const guidList = [...this._guidList];

        if (targetInput.checked) {
            guidList.push(targetInput.value);
        } else {
            const index = guidList.indexOf(targetInput.value);
            if (index !== -1) {
                guidList.splice(index, 1);
            }
        }

        this._guidList = guidList;
        this._notifyOutputChanged();
    }

    /**
     * Renders records into the UI.
     */
    private renderRecords(entities: Record<string, unknown>[]): void {
        for (const entity of entities) {
            const checkboxId = this.getSafeString(entity[`${this._entityName}id`]);
            const fieldValue = this.getSafeString(entity[this._fieldName]);
            const formattedValue = this.getSafeString(
                entity[`${this._fieldName}@OData.Community.Display.V1.FormattedValue`], 
                fieldValue || "Unnamed Option"
            );

            // Create checkbox
            const checkbox = this.createStyledElement("input", [], {
                type: "checkbox",
                id: checkboxId,
                value: checkboxId,
            });
            checkbox.addEventListener("change", this.checkBoxChanged.bind(this));

            // Create label
            const label = this.createStyledElement("label", [], {
                htmlFor: checkboxId,
                textContent: formattedValue,
            });

            // Wrap checkbox and label in a list item
            const listItem = this.createStyledElement("li");
            listItem.appendChild(checkbox);
            listItem.appendChild(label);

            // Append to unordered list
            this._unorderedList.appendChild(listItem);
        }
    }

    /**
     * Handles errors during API calls.
     */
    private handleError(error: unknown): void {
        console.error("Error retrieving records:", error);
        this._errorLabel.textContent = error instanceof Error ? error.message : "An error occurred while loading data.";
        this._errorLabel.classList.add("visible");
    }

    /**
     * Utility method to create styled HTML elements.
     */
    private createStyledElement<K extends keyof HTMLElementTagNameMap>(
        tagName: K,
        classNames: string[] = [],
        attributes: Partial<HTMLElementTagNameMap[K]> & Record<string, string | boolean> = {} as Partial<HTMLElementTagNameMap[K]> &
            Record<string, string | boolean>
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tagName);
        element.classList.add(...classNames);

        // Assign attributes safely
        Object.entries(attributes).forEach(([key, value]) => {
            if (typeof value === "string" || typeof value === "boolean") {
                (element as Record<string, string | boolean>)[key] = value;
            }
        });

        return element;
    }

    /**
     * Utility method to safely retrieve a string value.
     */
    private getSafeString(value: unknown, defaultValue = ""): string {
        return typeof value === "string" ? value : defaultValue;
    }
}
