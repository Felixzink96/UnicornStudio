CREATE OR REPLACE FUNCTION increment_component_usage(component_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cms_components 
  SET usage_count = COALESCE(usage_count, 0) + 1 
  WHERE id = component_id;
END;
$$;
