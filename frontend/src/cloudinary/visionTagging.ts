import { useState } from "react";

export interface TagDefinition {
  name: string;
  description: string; // question to ask the model about the image, e.g. "Is there a dog in the image?"
}

export interface TagResult {
  name: string;
  confidence: number;
  value: string; // "yes" | "no"
}

export function useAiVisionTagging() {
  const [tags, setTags] = useState<TagResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (imageUri: string, tagDefinitions: TagDefinition[]) => {
    setLoading(true);
    setError(null);
    setTags([]);

    const batches: TagDefinition[][] = [];
    for (let i = 0; i < tagDefinitions.length; i += 10) {
      batches.push(tagDefinitions.slice(i, i + 10));
    }

    try {
      const results = await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch("/api/analyze-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: { uri: imageUri },
              tag_definitions: batch,
            }),
          });
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          const data = await res.json();
          return (data?.data?.analysis?.tags ?? []) as TagResult[];
        })
      );

      const allTags = results.flat();
      setTags(allTags);
      console.log(allTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return { analyze, tags, loading, error };
}

