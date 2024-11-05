"use client";

import { useEffect, useState } from 'react';
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";

interface Column {
  name: string;
  type: 'numeric' | 'categorical';
  options?: string[];
}

const DEFAULT_HOURS = [
  "Less than 1",
  "1 - 2",
  "2 - 3",
  "3 - 4",
  "More than 4"
];

export default function Home() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize form without zodResolver
  const form = useForm({
    defaultValues: {},
  });

  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const response = await fetch('/api/predict');
        const data = await response.json();
        
        if (data.success && data.columns) {
          setColumns(data.columns);
          
          // Create default values based on columns
          const defaultValues: Record<string, string> = {};
          data.columns.forEach((column: Column) => {
            defaultValues[column.name] = "";
          });

          form.reset(defaultValues);
        } else {
          setError('Failed to load form structure');
        }
      } catch (err) {
        setError('Failed to fetch form structure');
      }
    };

    fetchColumns();
  }, []);

  const onSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    setPrediction(null);
    setError(null);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (data.success) {
        setPrediction(data.prediction);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (err) {
      setError('Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  if (columns.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Self-Care Recommendation System
          </CardTitle>
          <CardDescription>
            Answer these questions to get personalized self-care recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {columns.map((column) => (
                <FormField
                  key={column.name}
                  control={form.control}
                  name={column.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{column.name}</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {(column.type === 'categorical' && column.options 
                              ? column.options 
                              : DEFAULT_HOURS
                            ).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get Recommendation
              </Button>
            </form>
          </Form>

          {(prediction || error) && (
            <Alert className={`mt-6 ${error ? 'variant-destructive' : ''}`}>
              <AlertTitle>{error ? 'Error' : 'Recommended Self-Care Tip'}</AlertTitle>
              <AlertDescription>{error || prediction}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const LoadingCard = () => (
  <Card className="max-w-2xl mx-auto">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Brain className="h-6 w-6" />
        Self-Care Recommendation System
      </CardTitle>
      <CardDescription>
        Loading form structure...
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    </CardContent>
  </Card>
);