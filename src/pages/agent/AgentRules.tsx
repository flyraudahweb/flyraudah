import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, FileText, Scale, ShieldAlert, Loader2 } from "lucide-react";

const iconMap: Record<string, any> = {
    Scale,
    FileText,
    AlertTriangle,
};

const AgentRules = () => {
    const { data: rules, isLoading } = useQuery({
        queryKey: ["agent-rules"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("site_settings")
                .select("value")
                .eq("key", "agent_rules_content")
                .maybeSingle();
            if (error) throw error;
            return data?.value as any;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const defaultRules = {
        title: "Terms & Conditions",
        description: "Review the rules and guidelines for agents operating on the Raudah platform.",
        sections: [],
        acknowledgement: { title: "Acknowledgement", text: "" }
    };

    const content = rules || defaultRules;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">{content.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {content.description}
                </p>
            </div>

            <Card className="border-border/60 bg-background shadow-sm">
                <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-500">
                        <ShieldAlert className="h-5 w-5" />
                        Liability and Legal Disclaimer
                    </CardTitle>
                    <CardDescription>
                        These conditions apply to every booking made through the Raudah Agency Portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-sm text-muted-foreground leading-relaxed">
                    {content.sections?.map((section: any) => {
                        const Icon = iconMap[section.icon] || FileText;
                        return (
                            <div key={section.id} className="space-y-2">
                                <h3 className="text-foreground font-semibold text-base flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-emerald-600" />
                                    {section.id}. {section.title}
                                </h3>
                                <p>{section.content}</p>
                            </div>
                        );
                    })}

                    <div className="bg-muted/50 p-4 rounded-lg border border-border mt-6">
                        <p className="font-semibold text-foreground">{content.acknowledgement?.title}</p>
                        <p className="mt-1 text-xs">
                            {content.acknowledgement?.text}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentRules;
