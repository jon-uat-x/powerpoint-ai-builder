import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pjsjsynibeltjpusfald.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn('Supabase Anon Key not found. Please set VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'powerpoint-ai-builder-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'powerpoint-ai-builder'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Auth helper functions
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName
      });

    if (profileError) console.error('Error creating profile:', profileError);
  }

  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Subscribe to auth changes
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

// Real-time subscriptions
export const subscribeToPitchbook = (pitchbookId, callbacks) => {
  const channel = supabase
    .channel(`pitchbook:${pitchbookId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pitchbooks',
        filter: `id=eq.${pitchbookId}`
      },
      callbacks.onPitchbookChange || (() => {})
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'slides',
        filter: `pitchbook_id=eq.${pitchbookId}`
      },
      callbacks.onSlidesChange || (() => {})
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'placeholder_prompts'
      },
      callbacks.onPromptsChange || (() => {})
    )
    .on(
      'presence',
      {
        event: 'sync'
      },
      callbacks.onPresenceSync || (() => {})
    )
    .on(
      'presence',
      {
        event: 'join'
      },
      callbacks.onPresenceJoin || (() => {})
    )
    .on(
      'presence',
      {
        event: 'leave'
      },
      callbacks.onPresenceLeave || (() => {})
    );

  channel.subscribe();
  return channel;
};

export const unsubscribeFromChannel = (channel) => {
  supabase.removeChannel(channel);
};

// Presence tracking
export const trackPresence = async (channel, user, slideId) => {
  await channel.track({
    user_id: user.id,
    user_email: user.email,
    slide_id: slideId,
    online_at: new Date().toISOString()
  });
};

export const getPresenceState = (channel) => {
  return channel.presenceState();
};

// Database operations
export const db = {
  // Pitchbooks
  pitchbooks: {
    async getAll() {
      const { data, error } = await supabase
        .from('pitchbooks')
        .select(`
          *,
          organization:organizations(id, name, slug),
          creator:profiles!created_by(id, email, full_name),
          sections:pitchbook_sections(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async getById(id) {
      const { data, error } = await supabase
        .from('pitchbooks')
        .select(`
          *,
          organization:organizations(id, name, slug),
          creator:profiles!created_by(id, email, full_name),
          sections:pitchbook_sections(*),
          slides(
            *,
            placeholder_prompts(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },

    async create(pitchbookData) {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('pitchbooks')
        .insert({
          ...pitchbookData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('pitchbooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from('pitchbooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    }
  },

  // Slides
  slides: {
    async update(id, updates) {
      const { data, error } = await supabase
        .from('slides')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updatePrompts(slideId, prompts) {
      // Update slide-level prompt
      if (prompts.slidePrompt !== undefined) {
        const { error } = await supabase
          .from('slides')
          .update({
            slide_prompt: prompts.slidePrompt,
            slide_prompt_scoped: prompts.slidePromptScoped
          })
          .eq('id', slideId);

        if (error) throw error;
      }

      // Update placeholder prompts
      if (prompts.placeholderPrompts) {
        for (const [placeholderId, promptData] of Object.entries(prompts.placeholderPrompts)) {
          const { error } = await supabase
            .from('placeholder_prompts')
            .upsert({
              slide_id: slideId,
              placeholder_id: placeholderId,
              prompt_text: promptData.text,
              scope: promptData.scope || 'placeholder',
              applies_to: promptData.appliesTo
            }, {
              onConflict: 'slide_id,placeholder_id'
            });

          if (error) throw error;
        }
      }

      return { success: true };
    }
  },

  // Templates
  templates: {
    async getAll() {
      const { data, error } = await supabase
        .from('layout_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },

    async getByName(name) {
      const { data, error } = await supabase
        .from('layout_templates')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      return data;
    },

    async updatePrompts(name, prompts) {
      const { data, error } = await supabase
        .from('layout_templates')
        .update({ default_prompts: prompts })
        .eq('name', name)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Organizations
  organizations: {
    async getForUser() {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(item => item.organization);
    },

    async create(name, slug) {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          created_by: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      return org;
    }
  },

  // Activity
  activity: {
    async getForPitchbook(pitchbookId) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles!user_id(email, full_name)
        `)
        .eq('pitchbook_id', pitchbookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  }
};

export default supabase;