-- Create function to send webhook for new user registrations
CREATE OR REPLACE FUNCTION send_user_registration_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  user_email text;
  user_full_name text;
BEGIN
  -- Get user data from auth.users
  SELECT email, raw_user_meta_data->>'full_name' 
  INTO user_email, user_full_name
  FROM auth.users 
  WHERE id = NEW.user_id;

  -- Build webhook payload
  webhook_payload := jsonb_build_object(
    'type', 'user_registration',
    'userId', NEW.user_id,
    'email', user_email,
    'fullName', user_full_name,
    'authProvider', NEW.auth_provider,
    'registeredAt', NEW.created_at
  );

  -- Call Edge Function using pg_net extension
  PERFORM
    net.http_post(
      url := 'https://hook.eu2.make.com/vnrkd5r5hrvn4a5ssusekeysrb7lgkf2',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := webhook_payload::jsonb
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send user registration webhook: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registrations (on profiles table)
DROP TRIGGER IF EXISTS on_user_registration_webhook ON public.profiles;
CREATE TRIGGER on_user_registration_webhook
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_user_registration_webhook();

-- Create function to send webhook for new business creation
CREATE OR REPLACE FUNCTION send_business_creation_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload jsonb;
  owner_email text;
BEGIN
  -- Get owner email
  SELECT u.email INTO owner_email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.id = NEW.owner_id;

  -- Build webhook payload
  webhook_payload := jsonb_build_object(
    'type', 'business_creation',
    'businessId', NEW.id,
    'slug', NEW.slug,
    'businessName', NEW.name,
    'email', COALESCE(NEW.email, owner_email),
    'phone', NEW.phone,
    'businessCategory', NEW.business_category,
    'createdAt', NEW.created_at,
    'ownerId', NEW.owner_id
  );

  -- Call webhook directly using pg_net extension
  PERFORM
    net.http_post(
      url := 'https://hook.eu2.make.com/vnrkd5r5hrvn4a5ssusekeysrb7lgkf2',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := webhook_payload::jsonb
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send business creation webhook: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new business creation
DROP TRIGGER IF EXISTS on_business_creation_webhook ON public.businesses;
CREATE TRIGGER on_business_creation_webhook
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION send_business_creation_webhook();
