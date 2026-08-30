import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
} from 'react';
import { cn } from "./utils"
import { useForm as useReactHookForm, FormProvider as ReactHookFormProvider } from 'react-hook-form';

// Predefined validation patterns
const VALIDATION_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    url: /^https?:\/\/.+/,
};

// Helper function to convert validation rules to react-hook-form format
const convertValidationRules = (rules) => {
    const rhfRules = {};

    Object.entries(rules).forEach(([fieldName, rule]) => {
        rhfRules[fieldName] = {};

        if (rule.required) {
            rhfRules[fieldName].required = `${fieldName} is required`;
        }

        if (rule.minLength) {
            rhfRules[fieldName].minLength = {
                value: rule.minLength,
                message: `${fieldName} must be at least ${rule.minLength} characters`
            };
        }

        if (rule.maxLength) {
            rhfRules[fieldName].maxLength = {
                value: rule.maxLength,
                message: `${fieldName} must be no more than ${rule.maxLength} characters`
            };
        }

        if (rule.pattern) {
            let pattern;
            if (typeof rule.pattern === 'string' && VALIDATION_PATTERNS[rule.pattern]) {
                pattern = VALIDATION_PATTERNS[rule.pattern];
            } else if (typeof rule.pattern === 'string') {
                pattern = new RegExp(rule.pattern);
            } else {
                pattern = rule.pattern;
            }

            rhfRules[fieldName].pattern = {
                value: pattern,
                message: `Please enter a valid ${typeof rule.pattern === 'string' ? rule.pattern : 'format'}`
            };
        }

        if (rule.custom) {
            rhfRules[fieldName].validate = rule.custom;
        }
    });

    return rhfRules;
};

// Helper function to convert schema field validation to ValidationRules format
const schemaToValidationRules = (schema) => {
    const rules = {};

    for (const field of schema.fields) {
        const fieldRule = {};

        if (field.required) {
            fieldRule.required = true;
        }

        // Map field_type to pattern
        if (field.field_type === 'email') {
            fieldRule.pattern = 'email';
        } else if (field.field_type === 'phone') {
            fieldRule.pattern = 'phone';
        } else if (field.field_type === 'url') {
            fieldRule.pattern = 'url';
        }

        // Apply explicit validation rules from schema
        if (field.validation) {
            if (field.validation.minLength) fieldRule.minLength = field.validation.minLength;
            if (field.validation.maxLength) fieldRule.maxLength = field.validation.maxLength;
            if (field.validation.min) fieldRule.min = field.validation.min;
            if (field.validation.max) fieldRule.max = field.validation.max;
            if (field.validation.pattern) fieldRule.pattern = field.validation.pattern;
        }

        if (Object.keys(fieldRule).length > 0) {
            rules[field.field_key] = fieldRule;
        }
    }

    return rules;
};

// Helper function to derive default values from schema
const schemaToDefaultValues = (schema) => {
    const defaults = {};

    for (const field of schema.fields) {
        // Set appropriate default based on field type
        switch (field.field_type) {
            case 'checkbox':
                defaults[field.field_key] = false;
                break;
            case 'number':
                defaults[field.field_key] = '';
                break;
            default:
                defaults[field.field_key] = '';
        }
    }

    return defaults;
};

// Create context for WVC-specific form functionality
const WvcFormContext = createContext(null);

// Custom hook to use WVC form context
export const useWvcForm = () => {
    const context = useContext(WvcFormContext);
    if (!context) {
        throw new Error('useWvcForm must be used within a FormProvider');
    }
    return context;
};

// FormProvider component that wraps react-hook-form
const FormProvider = ({
    children,
    formId,
    sectionName,
    formKey,
    formSchema: propFormSchema,
    validationRules: propValidationRules = {},
    submitText: propSubmitText,
    successMessage: propSuccessMessage,
    errorMessage: propErrorMessage,
    defaultValues: propDefaultValues = {},
    formVersion = "1.0.0",
    ...divProps
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const submissionAttemptRef = useRef(0);

    // Resolve form schema from formKey or direct prop
    const resolvedSchema = React.useMemo(() => {
        // Direct schema takes precedence
        if (propFormSchema) return propFormSchema;

        // Try to load from window.__WVC_FORMS__
        if (formKey && typeof window !== 'undefined' && window.__WVC_FORMS__) {
            return window.__WVC_FORMS__[formKey];
        }

        return undefined;
    }, [formKey, propFormSchema]);

    // Derive configuration from schema with prop overrides
    const {
        validationRules,
        submitText,
        successMessage,
        errorMessage,
        defaultValues
    } = React.useMemo(() => {
        // Start with schema-derived values if available
        const schemaRules = resolvedSchema ? schemaToValidationRules(resolvedSchema) : {};
        const schemaDefaults = resolvedSchema ? schemaToDefaultValues(resolvedSchema) : {};

        return {
            // Merge: prop validation rules override schema rules
            validationRules: { ...schemaRules, ...propValidationRules },
            // Props or defaults (no schema fallback for UI messages - they're generated by AI per page)
            submitText: propSubmitText ?? "Submit",
            successMessage: propSuccessMessage ?? "Form submitted successfully!",
            errorMessage: propErrorMessage ?? "Failed to submit form. Please try again.",
            // Merge: prop default values override schema defaults
            defaultValues: { ...schemaDefaults, ...propDefaultValues }
        };
    }, [resolvedSchema, propValidationRules, propSubmitText, propSuccessMessage, propErrorMessage, propDefaultValues]);

    // Initialize react-hook-form with resolved default values
    const methods = useReactHookForm({
        defaultValues: defaultValues || {},
        mode: 'onBlur', // Validate on blur for better UX
    });

    const { handleSubmit: rhfHandleSubmit, reset, formState } = methods;

    // Check if form data contains any File objects
    const hasFileFields = useCallback((data) => {
        return Object.values(data).some(value =>
            value instanceof File ||
            (value instanceof FileList && value.length > 0)
        );
    }, []);

    // Convert form data to FormData if it contains files
    const prepareFormData = useCallback((data) => {
        if (!hasFileFields(data)) {
            return data; // Return plain object if no files
        }

        // Convert to FormData for file uploads
        const formDataObj = new FormData();
        for (const [key, value] of Object.entries(data)) {
            if (value instanceof FileList) {
                // Handle FileList (multiple files)
                for (let i = 0; i < value.length; i++) {
                    formDataObj.append(key, value[i]);
                }
            } else if (value instanceof File) {
                formDataObj.append(key, value);
            } else if (value !== undefined && value !== null) {
                formDataObj.append(key, String(value));
            }
        }
        return formDataObj;
    }, [hasFileFields]);

    // Submit form
    const handleSubmit = useCallback(async (data) => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setSubmitError(null);
        submissionAttemptRef.current += 1;

        try {
            // Prepare form data (converts to FormData if files present)
            const preparedData = prepareFormData(data);

            // Prepare submission data
            const submissionData = {
                // Required fields
                sectionName,
                formId,
                formKey: formKey || resolvedSchema?.form_key,  // Include registered form key if available
                formData: preparedData,

                // Auto-generated fields
                timestamp: Date.now(),
                sessionId: wvcClient.getSessionId?.() || 'unknown',
                pageUrl: window.location.href,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
                // Optional metadata
                validationErrors: formState.errors || null,
                submissionAttempt: submissionAttemptRef.current,
                formVersion,

                // Additional metadata can be added here
                validationRules,
            };

            // Call wvcClient.formSubmission
            const submissionResponse = await wvcClient.formSubmission(submissionData);

            // Success
            setIsSubmitted(true);
            setSubmitError(null);

        } catch (error) {
            console.error('Form submission error:', error);
            setSubmitError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        isSubmitting,
        sectionName,
        formId,
        formState.errors,
        errorMessage,
        prepareFormData,
        formKey,
        resolvedSchema,
        formVersion,
        validationRules,
    ]);

    // Reset form
    const resetForm = useCallback(() => {
        reset();
        setIsSubmitted(false);
        setSubmitError(null);
        submissionAttemptRef.current = 0;
    }, [reset]);

    const wvcFormValue = {
        formId,
        sectionName,
        isSubmitting,
        isSubmitted,
        submitError,
        successMessage,
        formSchema: resolvedSchema,
        handleSubmit: rhfHandleSubmit(handleSubmit),
        resetForm,
        // Expose react-hook-form methods
        control: methods.control,
        formState: methods.formState,
        register: methods.register,
        setValue: methods.setValue,
        getValues: methods.getValues,
        watch: methods.watch,
    };

    return (
        <ReactHookFormProvider {...methods}>
            <WvcFormContext.Provider value={wvcFormValue}>
                <div
                    {...divProps}
                    data-wvc-dynamic="FormProvider"
                    data-wvc-formId={formId}
                    data-wvc-formKey={formKey || resolvedSchema?.form_key || undefined}
                >
                    {children}
                </div>
            </WvcFormContext.Provider>
        </ReactHookFormProvider>
    );
};

export { FormProvider };