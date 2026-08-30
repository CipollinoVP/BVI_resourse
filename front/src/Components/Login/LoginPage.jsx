import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "../common/button";
import { Input } from "../common/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../common/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../common/form";
import { FormProvider, useWvcForm } from "../common/FormProvider";

// Внутренний компонент, который использует useWvcForm
const LoginFormContent = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [localError, setLocalError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    handleSubmit,
    isSubmitting,
    formState: { errors },
    control,
    setValue,
    getValues,
  } = useWvcForm();

  // Отключаем автоматическую отправку через FormProvider
  const onSubmit = async (data) => {
    // Проверяем, что данные есть
    if (!data.username || !data.password) {
      setLocalError('Пожалуйста, заполните все поля');
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      await login(data.username, data.password);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setLocalError('Неверное имя пользователя или пароль');
      } else {
        setLocalError(err.message || 'Ошибка при входе в систему');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: "easeOut"
      }
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.3 }
    }
  };

  // Переопределяем handleSubmit, чтобы избежать автоматической отправки
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const data = getValues();
    onSubmit(data);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={formVariants}
      style={styles.wrapper}
    >
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle style={styles.title}>Авторизация</CardTitle>
          <CardDescription style={styles.description}>
            Введите ваши учетные данные для входа в систему
          </CardDescription>
        </CardHeader>

        <CardContent>
          {localError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.error}
            >
              {localError}
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit} style={styles.form}>
            <motion.div variants={inputVariants}>
              <FormField
                name="username"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={styles.label}>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@mail.com"
                        disabled={isLoading || isSubmitting}
                        className={errors.username ? "border-red-500" : ""}
                        style={styles.input}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              variants={inputVariants}
              transition={{ delay: prefersReducedMotion ? 0 : 0.1 }}
            >
              <FormField
                name="password"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={styles.label}>Пароль</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading || isSubmitting}
                        className={errors.password ? "border-red-500" : ""}
                        style={styles.input}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              style={styles.options}
              variants={inputVariants}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
            >
              <label style={styles.rememberMe}>
                <input type="checkbox" style={styles.checkbox} /> Запомнить меня
              </label>
            </motion.div>

            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              variant="default"
              size="lg"
              style={styles.button}
            >
              {(isLoading || isSubmitting) ? (
                <span style={styles.loading}>
                  <span style={styles.spinner} />
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Основной компонент
const LoginPage = () => {
  const formConfig = {
    formId: 'login-form',
    sectionName: 'login',
    formKey: 'login_form',
    submitText: 'Войти',
    successMessage: 'Вы успешно вошли в систему!',
    errorMessage: 'Не удалось войти. Пожалуйста, проверьте свои учетные данные и попробуйте снова.',
    defaultValues: {
      username: '',
      password: '',
    },
  };

  return (
    <div style={styles.pageContainer}>
      <FormProvider {...formConfig}>
        <LoginFormContent />
      </FormProvider>
    </div>
  );
};

export default LoginPage;

const styles = {
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 80px)',
    padding: '2rem 1rem',
    background: 'transparent',
  },
  wrapper: {
    width: '100%',
    maxWidth: '440px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '2rem',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  title: {
    textAlign: 'center',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '0.25rem',
  },
  description: {
    textAlign: 'center',
    color: '#718096',
    fontSize: '0.95rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  label: {
    fontWeight: '500',
    color: '#2d3748',
    marginBottom: '0.25rem',
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'border-color 0.2s',
    width: '100%',
    background: '#f7fafc',
  },
  error: {
    color: '#dc3545',
    marginBottom: '1.25rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fff5f5',
    borderRadius: '8px',
    border: '1px solid #fed7d7',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  success: {
    color: '#155724',
    marginBottom: '1.25rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f0fff4',
    borderRadius: '8px',
    border: '1px solid #c6f6d5',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  options: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  rememberMe: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#4a5568',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#667eea',
  },
  forgotPassword: {
    fontSize: '0.9rem',
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  button: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footerText: {
    textAlign: 'center',
    width: '100%',
    fontSize: '0.95rem',
    color: '#4a5568',
    paddingTop: '0.5rem',
  },
  registerLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
};