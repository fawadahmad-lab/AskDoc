"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteDocument, getDocuments, uploadDocument } from "@/lib/api";

export function useDocuments() {
  const queryClient = useQueryClient();
  const docsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  return {
    documents: docsQuery.data ?? [],
    isLoading: docsQuery.isLoading,
    isError: docsQuery.isError,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
