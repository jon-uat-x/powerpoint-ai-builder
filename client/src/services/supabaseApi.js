import { supabase, getCurrentUser } from '../lib/supabase';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};

// Layout APIs (using local backend for now)
export const layoutAPI = {
  getAll: () => fetch('http://localhost:5000/api/layouts').then(r => r.json()),
  getByName: (name) => fetch(`http://localhost:5000/api/layouts/${encodeURIComponent(name)}`).then(r => r.json()),
};

// Pitchbook APIs using Supabase
export const pitchbookAPI = {
  // Get all pitchbooks
  async getAll() {
    const { data, error } = await supabase
      .from('pitchbooks')
      .select(`
        *,
        sections:pitchbook_sections(count),
        slides(count)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    // Transform to match existing API format
    return data.map(pb => ({
      id: pb.id,
      title: pb.title,
      type: pb.type,
      status: pb.status,
      createdAt: pb.created_at,
      updatedAt: pb.updated_at,
      sectionCount: pb.sections?.[0]?.count || 0,
      slideCount: pb.slides?.[0]?.count || 0,
      pitchbookPrompt: pb.pitchbook_prompt,
      scopedPrompts: pb.scoped_prompts
    }));
  },

  // Get single pitchbook with all details
  async getById(id) {
    const { data, error } = await supabase
      .from('pitchbooks')
      .select(`
        *,
        sections:pitchbook_sections(*),
        slides(*, placeholder_prompts(*))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Transform to match existing API format
    return {
      id: data.id,
      title: data.title,
      type: data.type,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pitchbookPrompt: data.pitchbook_prompt,
      scopedPrompts: data.scoped_prompts || {},
      inheritTemplatePrompts: data.inherit_template_prompts,
      sections: data.sections?.map(s => ({
        id: s.id,
        title: s.title,
        orderIndex: s.order_index,
        numberOfSlides: s.number_of_slides,
        prompt: s.section_prompt
      })) || [],
      slides: data.slides?.map(s => ({
        id: s.id,
        slideNumber: s.slide_number,
        layoutName: s.layout_name,
        layoutData: s.layout_data,  // Include saved layout data
        layout: s.layout_data,  // For compatibility
        slideType: s.slide_type,
        type: s.slide_type || s.layout_data?.type || 'body',
        sectionTitle: s.section_title,
        prompt: s.slide_prompt,
        slidePrompt: s.slide_prompt,
        promptScoped: s.slide_prompt_scoped,
        content: s.content,
        notes: s.notes,
        isGenerated: s.is_generated,
        placeholderPrompts: s.placeholder_prompts?.reduce((acc, pp) => {
          acc[pp.placeholder_id] = {
            prompt: pp.prompt,
            generatedContent: pp.generated_content
          };
          return acc;
        }, {}),
        prompts: s.placeholder_prompts?.reduce((acc, pp) => {
          acc[pp.placeholder_id] = pp.prompt;
          return acc;
        }, {})
      })) || []
    };
  },

  // Create new pitchbook using atomic function
  async create(data) {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Get default organization (for now, using the default one)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    const organizationId = orgs?.[0]?.id;
    if (!organizationId) throw new Error('No organization found');

    const { data: result, error } = await supabase.rpc('create_pitchbook_atomic', {
      p_title: data.title,
      p_type: data.type || 'standard',
      p_organization_id: organizationId,
      p_user_id: user.id,
      p_sections: data.sections?.map((s, index) => ({
        title: s.title,
        numberOfSlides: s.numberOfSlides || 1,
        prompt: s.prompt || '',
        order_index: index
      })) || [],
      p_prompts: {
        pitchbook_prompt: data.pitchbookPrompt || '',
        scoped_prompts: data.scopedPrompts || {}
      }
    });

    if (error) throw error;
    
    const resultData = result[0];
    if (!resultData.success) {
      throw new Error(resultData.message);
    }

    // Return the created pitchbook
    return this.getById(resultData.pitchbook_id);
  },

  // Update pitchbook
  async update(id, data) {
    const updates = {};
    
    if (data.title !== undefined) updates.title = data.title;
    if (data.status !== undefined) updates.status = data.status;
    if (data.pitchbookPrompt !== undefined) updates.pitchbook_prompt = data.pitchbookPrompt;
    if (data.scopedPrompts !== undefined) updates.scoped_prompts = data.scopedPrompts;
    if (data.prompts !== undefined) {
      updates.pitchbook_prompt = data.prompts.pitchbookPrompt;
      updates.scoped_prompts = data.prompts.scopedPrompts;
    }

    // Handle slides update
    if (data.slides !== undefined) {
      // Get existing slides to determine which are new
      const { data: existingSlides } = await supabase
        .from('slides')
        .select('id, slide_number')
        .eq('pitchbook_id', id);
      
      const existingSlideNumbers = new Set(existingSlides?.map(s => s.slide_number) || []);
      
      // Update or insert slides
      for (const slide of data.slides) {
        const slideData = {
          pitchbook_id: id,
          slide_number: slide.slideNumber,
          layout_name: slide.layoutName,
          layout_data: slide.layoutData || slide.layout || null,
          slide_type: slide.type || slide.slideType || 'body',
          section_title: slide.sectionTitle || null,
          slide_prompt: slide.slidePrompt || slide.prompt || null
        };
        
        if (existingSlideNumbers.has(slide.slideNumber)) {
          // Update existing slide
          const { error: slideError } = await supabase
            .from('slides')
            .update(slideData)
            .eq('pitchbook_id', id)
            .eq('slide_number', slide.slideNumber);
            
          if (slideError) {
            console.error('Error updating slide:', slideError);
          }
        } else {
          // Insert new slide
          const { error: slideError } = await supabase
            .from('slides')
            .insert(slideData);
            
          if (slideError) {
            console.error('Error inserting slide:', slideError);
          }
        }
      }
      
      // Delete slides that are no longer in the array
      const newSlideNumbers = new Set(data.slides.map(s => s.slideNumber));
      const slidesToDelete = existingSlides?.filter(s => !newSlideNumbers.has(s.slide_number)) || [];
      
      if (slidesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('slides')
          .delete()
          .eq('pitchbook_id', id)
          .in('slide_number', slidesToDelete.map(s => s.slide_number));
          
        if (deleteError) {
          console.error('Error deleting slides:', deleteError);
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('pitchbooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return this.getById(id);
  },

  // Delete pitchbook
  async delete(id) {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('delete_pitchbook_safe', {
      p_pitchbook_id: id,
      p_user_id: user.id
    });

    if (error) throw error;
    
    const result = data[0];
    if (!result.success) {
      throw new Error(result.message);
    }

    return { success: true, message: result.message };
  }
};

// Thumbnail APIs (using local backend for now)
export const thumbnailAPI = {
  getAll: (format = 'base64') => 
    fetch(`http://localhost:5000/api/thumbnails?format=${format}`).then(r => r.json()),
  getByLayout: (layoutName, format = 'base64') => 
    fetch(`http://localhost:5000/api/thumbnails/${encodeURIComponent(layoutName)}?format=${format}`).then(r => r.json()),
};

// Generate APIs (will need to be updated to use Edge Functions)
export const generateAPI = {
  generate: (pitchbookId) => 
    fetch(`http://localhost:5000/api/generate/${pitchbookId}`, { method: 'POST' }).then(r => r.json()),
  getStatus: (pitchbookId) => 
    fetch(`http://localhost:5000/api/generate/${pitchbookId}/status`).then(r => r.json()),
};

// Template Prompts APIs (using local backend for now)
export const templatePromptsAPI = {
  getAll: () => 
    fetch('http://localhost:5000/api/template-prompts').then(r => r.json()),
  getByLayout: (layoutName) => 
    fetch(`http://localhost:5000/api/template-prompts/${encodeURIComponent(layoutName)}`).then(r => r.json()),
  updateAll: (layoutName, prompts) => 
    fetch(`http://localhost:5000/api/template-prompts/${encodeURIComponent(layoutName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts })
    }).then(r => r.json()),
  updateSingle: (layoutName, placeholderId, prompt) => 
    fetch(`http://localhost:5000/api/template-prompts/${encodeURIComponent(layoutName)}/${encodeURIComponent(placeholderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }).then(r => r.json()),
  delete: (layoutName, placeholderId) => 
    fetch(`http://localhost:5000/api/template-prompts/${encodeURIComponent(layoutName)}/${encodeURIComponent(placeholderId)}`, {
      method: 'DELETE'
    }).then(r => r.json()),
};

// Slide APIs
export const slideAPI = {
  async update(id, updates) {
    const { data, error } = await supabase
      .from('slides')
      .update({
        content: updates.content,
        slide_prompt: updates.prompt,
        notes: updates.notes,
        is_generated: updates.isGenerated
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePrompts(slideId, prompts) {
    // Update slide prompt
    if (prompts.prompt !== undefined) {
      const { error } = await supabase
        .from('slides')
        .update({
          slide_prompt: prompts.prompt,
          slide_prompt_scoped: prompts.promptScoped
        })
        .eq('id', slideId);

      if (error) throw error;
    }

    // Update placeholder prompts if provided
    if (prompts.placeholderPrompts) {
      for (const [placeholderId, promptData] of Object.entries(prompts.placeholderPrompts)) {
        const { error } = await supabase
          .from('placeholder_prompts')
          .upsert({
            slide_id: slideId,
            placeholder_id: placeholderId,
            prompt: promptData.prompt || promptData,
            generated_content: promptData.generatedContent
          }, {
            onConflict: 'slide_id,placeholder_id'
          });

        if (error) throw error;
      }
    }

    return { success: true };
  }
};

export default {
  layoutAPI,
  pitchbookAPI,
  thumbnailAPI,
  generateAPI,
  templatePromptsAPI,
  slideAPI
};