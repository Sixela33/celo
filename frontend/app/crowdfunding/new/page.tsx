"use client";

import { useCallback, useMemo, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type PhotoEntry = { url: string };
type FormValues = {
  generalDescription: string;
  detailedDescription: string;
  geographicLocation: string;
  predominantWasteTypes: string;
  riskSummary: string;
  estimatedTimeHours: string;
  peopleRequired: string;
  laborCost: string;
  materialsCost: string;
  latitude: string;
  longitude: string;
  receiverAddress: string;
  targetAmount: string;
};

export default function NewCrowdfundingPage() {
  const [generalDescription, setGeneralDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [geographicLocation, setGeographicLocation] = useState("");
  const [predominantWasteTypes, setPredominantWasteTypes] = useState("");
  const [riskSummary, setRiskSummary] = useState("");
  const [estimatedTimeHours, setEstimatedTimeHours] = useState("");
  const [peopleRequired, setPeopleRequired] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photoUrls, setPhotoUrls] = useState<PhotoEntry[]>([{ url: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const photosAsArray = useMemo(() => photoUrls.map((p) => p.url).filter(Boolean), [photoUrls]);

  const addPhotoField = useCallback(() => {
    setPhotoUrls((prev) => [...prev, { url: "" }]);
  }, []);

  const updatePhotoField = useCallback((idx: number, value: string) => {
    setPhotoUrls((prev) => prev.map((p, i) => (i === idx ? { url: value } : p)));
  }, []);

  const removePhotoField = useCallback((idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const form: UseFormReturn<FormValues> = useForm<FormValues>({
    defaultValues: {
      generalDescription: "",
      detailedDescription: "",
      geographicLocation: "",
      predominantWasteTypes: "",
      riskSummary: "",
      estimatedTimeHours: "",
      peopleRequired: "",
      laborCost: "",
      materialsCost: "",
      latitude: "",
      longitude: "",
      receiverAddress: "",
      targetAmount: "",
    },
  });

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setResultMessage(null);

    try {
      const payload = {
        task_id: uuidv4(),
        user_id: 0,
        crowdfunding_data: {
          general_description: form.getValues("generalDescription"),
          detailed_description: form.getValues("detailedDescription"),
          geographic_location: form.getValues("geographicLocation"),
          predominant_waste_types: form
            .getValues("predominantWasteTypes")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          risk_summary: form.getValues("riskSummary"),
        },
        task_specifics: {
          materials_needed: {},
          estimated_time_hours: Number(form.getValues("estimatedTimeHours")) || 0,
          people_required: Number(form.getValues("peopleRequired")) || 0,
          labor_cost: Number(form.getValues("laborCost")) || 0,
          materials_cost: Number(form.getValues("materialsCost")) || 0,
          photo_breakdown: [],
        },
        total_cost:
          (Number(form.getValues("laborCost")) || 0) +
          (Number(form.getValues("materialsCost")) || 0),
        photos: photosAsArray,
        location_gps: {
          latitude: form.getValues("latitude")
            ? Number(form.getValues("latitude"))
            : null,
          longitude: form.getValues("longitude")
            ? Number(form.getValues("longitude"))
            : null,
          address: null,
        },
        created_at: new Date().toISOString(),
        receiver_address: form.getValues("receiverAddress"),
        target_amount: Number(form.getValues("targetAmount")) || 0,
      };

      const res = await fetch("/api/crowdfunding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Request failed");
      }
      setResultMessage("Crowdfunding created successfully.");
    } catch (err) {
      setResultMessage((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, photosAsArray]);

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Crowdfunding</CardTitle>
          <CardDescription>Provide basic information to create a crowdfunding entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField<FormValues>
                control={form.control}
                name="generalDescription"
                rules={{ required: "Required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>General Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Limpiar plaza" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<FormValues>
                control={form.control}
                name="detailedDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description (Markdown)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full rounded-md border border-input bg-background p-2 text-sm"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField<FormValues>
                  control={form.control}
                  name="geographicLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geographic Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Buenos Aires, Argentina" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<FormValues>
                  control={form.control}
                  name="predominantWasteTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Predominant Waste Types (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="Escombros, Papeles Carton, Bolsas Plasticas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
              <FormField<FormValues>
                control={form.control}
                name="riskSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Summary</FormLabel>
                    <FormControl>
                      <Input placeholder="Riesgo Medio - Requiere precaución" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField<FormValues>
                  control={form.control}
                  name="estimatedTimeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Time (hours)</FormLabel>
                      <FormControl>
                        <Input placeholder="1.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<FormValues>
                  control={form.control}
                  name="peopleRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>People Required</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField<FormValues>
                  control={form.control}
                  name="laborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labor Cost</FormLabel>
                      <FormControl>
                        <Input placeholder="52.6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<FormValues>
                  control={form.control}
                  name="materialsCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materials Cost</FormLabel>
                      <FormControl>
                        <Input placeholder="12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField<FormValues>
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="-34.578234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<FormValues>
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="-58.491806" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

              <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Photo URLs</label>
                <Button type="button" variant="secondary" onClick={addPhotoField}>Add</Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField<FormValues>
                  control={form.control}
                  name="receiverAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField<FormValues>
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount (tokens)</FormLabel>
                      <FormControl>
                        <Input placeholder="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                {photoUrls.map((p, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={p.url} onChange={(e) => updatePhotoField(idx, e.target.value)} placeholder="https://..." />
                    <Button type="button" variant="destructive" onClick={() => removePhotoField(idx)}>Remove</Button>
                  </div>
                ))}
              </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Create"}</Button>
                {resultMessage && (
                  <span className="text-sm text-muted-foreground">{resultMessage}</span>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


