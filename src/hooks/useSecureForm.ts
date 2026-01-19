import { useState, useCallback } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { checkClientRateLimit } from '@/utils/security';

interface UseSecureFormOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
}

interface UseSecureFormReturn {
  handleSubmit: (formData: unknown) => Promise<boolean>;
  isSubmitting: boolean;
  errors: string[];
  clearErrors: () => void;
}

/**
 * Hook آمن للتعامل مع النماذج
 */
export function useSecureForm<T>({
  schema,
  onSubmit,
  rateLimitKey = 'form_submit',
  maxAttempts = 10,
  windowMs = 60000
}: UseSecureFormOptions<T>): UseSecureFormReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleSubmit = useCallback(async (formData: unknown): Promise<boolean> => {
    if (!checkClientRateLimit(rateLimitKey, maxAttempts, windowMs)) {
      toast.error('محاولات كثيرة جداً، يرجى الانتظار دقيقة');
      return false;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = schema.safeParse(formData);

      if (!result.success) {
        const errorMessages = result.error.errors.map(e => e.message);
        setErrors(errorMessages);
        errorMessages.forEach(error => toast.error(error));
        return false;
      }

      await onSubmit(result.data);
      return true;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setErrors([message]);
      toast.error(message);
      return false;

    } finally {
      setIsSubmitting(false);
    }
  }, [schema, onSubmit, rateLimitKey, maxAttempts, windowMs]);

  return { handleSubmit, isSubmitting, errors, clearErrors };
}
