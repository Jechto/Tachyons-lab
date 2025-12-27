import { getAssetPath } from "../utils/paths";

export type CardTypeFilter = "All" | "Speed" | "Stamina" | "Power" | "Guts" | "Wit" | "Support";

interface CardTypeSelectorProps {
    selectedType: string;
    onSelect: (type: CardTypeFilter) => void;
    className?: string;
}

export default function CardTypeSelector({ selectedType, onSelect, className = "" }: CardTypeSelectorProps) {
    const getCardTypeIcon = (cardType: string): string => {
        switch (cardType) {
            case "Speed":
                return getAssetPath("images/icons/Speed.png");
            case "Stamina":
                return getAssetPath("images/icons/Stamina.png");
            case "Power":
                return getAssetPath("images/icons/Power.png");
            case "Guts":
                return getAssetPath("images/icons/Guts.png");
            case "Wit":
                return getAssetPath("images/icons/Intelligence.png");
            case "Support":
                return getAssetPath("images/icons/Support.png");
            default: // "All"
                return getAssetPath("images/icons/Support.png");
        }
    };

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Type:
            </label>
            <div className="flex flex-wrap gap-2">
                {(["All", "Speed", "Stamina", "Power", "Guts", "Wit", "Support"] as CardTypeFilter[]).map((type) => (
                    <label key={type} className="flex items-center">
                        <input
                            type="radio"
                            name="cardType"
                            value={type}
                            checked={selectedType === type}
                            onChange={(e) => onSelect(e.target.value as CardTypeFilter)}
                            className="sr-only"
                        />
                        <div 
                            className={`relative cursor-pointer transition-all duration-200 rounded-lg w-10 h-10 flex items-center justify-center ${
                                selectedType === type
                                    ? type === "All"
                                        ? "bg-slate-600 text-white shadow-lg scale-110 border-2 border-slate-400"
                                        : "shadow-lg scale-110 border-2"
                                    : "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 hover:scale-105 border-2 border-transparent"
                            } ${
                                selectedType === type && type !== "All"
                                    ? type === "Speed"
                                        ? "border-blue-300"
                                        : type === "Stamina"
                                        ? "border-red-300"
                                        : type === "Power"
                                        ? "border-orange-300"
                                        : type === "Guts"
                                        ? "border-pink-300"
                                        : type === "Wit"
                                        ? "border-green-300"
                                        : "border-purple-300" // Support
                                    : ""
                            }`}
                            style={type !== "All" ? {
                                backgroundImage: `url(${getCardTypeIcon(type)})`,
                                backgroundSize: '110%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                            } : {}}
                            title={type}
                        >
                            {type === "All" && (
                                <span className="text-2xl font-bold">∀</span>
                            )}
                            {/* Active indicator dot */}
                            {selectedType === type && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border border-gray-300 shadow-sm"></div>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}
