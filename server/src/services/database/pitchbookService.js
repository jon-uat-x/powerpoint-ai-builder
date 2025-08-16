const { supabase, createUserClient } = require('./supabaseClient');

class PitchbookService {
  // Get all pitchbooks for a user's organizations
  async getAllForUser(accessToken) {
    const client = createUserClient(accessToken);
    
    const { data, error } = await client
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
  }

  // Get a specific pitchbook with all related data
  async getById(id, accessToken) {
    const client = createUserClient(accessToken);
    
    const { data, error } = await client
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
  }

  // Create a new pitchbook
  async create(pitchbookData, userId, organizationId, accessToken) {
    const client = createUserClient(accessToken);
    
    // Start a transaction
    const { data: pitchbook, error: pitchbookError } = await client
      .from('pitchbooks')
      .insert({
        title: pitchbookData.title,
        type: pitchbookData.type || 'standard',
        organization_id: organizationId,
        created_by: userId,
        pitchbook_prompt: pitchbookData.pitchbookPrompt,
        scoped_prompts: pitchbookData.scopedPrompts || {}
      })
      .select()
      .single();

    if (pitchbookError) throw pitchbookError;

    // Create sections
    if (pitchbookData.sections && pitchbookData.sections.length > 0) {
      const sections = pitchbookData.sections.map((section, index) => ({
        pitchbook_id: pitchbook.id,
        title: section.title,
        order_index: index,
        number_of_slides: section.numberOfSlides || 1,
        section_prompt: section.prompt
      }));

      const { data: createdSections, error: sectionsError } = await client
        .from('pitchbook_sections')
        .insert(sections)
        .select();

      if (sectionsError) throw sectionsError;

      // Generate slide structure
      const slides = await this.generateSlideStructure(
        pitchbook.id, 
        createdSections, 
        pitchbookData.inheritTemplatePrompts,
        client
      );

      pitchbook.sections = createdSections;
      pitchbook.slides = slides;
    }

    // Log activity
    await this.logActivity(userId, organizationId, pitchbook.id, 'created_pitchbook', {
      title: pitchbook.title
    }, client);

    return pitchbook;
  }

  // Update a pitchbook
  async update(id, updates, userId, accessToken) {
    const client = createUserClient(accessToken);
    
    const { data, error } = await client
      .from('pitchbooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(userId, data.organization_id, id, 'updated_pitchbook', {
      updates: Object.keys(updates)
    }, client);

    return data;
  }

  // Update prompts for a slide
  async updateSlidePrompts(slideId, prompts, userId, accessToken) {
    const client = createUserClient(accessToken);
    
    // Update slide-level prompt
    if (prompts.slidePrompt !== undefined) {
      const { error: slideError } = await client
        .from('slides')
        .update({
          slide_prompt: prompts.slidePrompt,
          slide_prompt_scoped: prompts.slidePromptScoped
        })
        .eq('id', slideId);

      if (slideError) throw slideError;
    }

    // Update placeholder prompts
    if (prompts.placeholderPrompts) {
      for (const [placeholderId, promptData] of Object.entries(prompts.placeholderPrompts)) {
        const { error } = await client
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

  // Delete a pitchbook
  async delete(id, userId, accessToken) {
    const client = createUserClient(accessToken);
    
    // Get pitchbook info for logging
    const { data: pitchbook } = await client
      .from('pitchbooks')
      .select('title, organization_id')
      .eq('id', id)
      .single();

    const { error } = await client
      .from('pitchbooks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log activity
    if (pitchbook) {
      await this.logActivity(userId, pitchbook.organization_id, null, 'deleted_pitchbook', {
        title: pitchbook.title,
        pitchbook_id: id
      }, client);
    }

    return { success: true };
  }

  // Generate slide structure
  async generateSlideStructure(pitchbookId, sections, inheritTemplatePrompts, client) {
    const slides = [];
    let slideNumber = 1;

    // Add mandatory slides
    const mandatorySlides = [
      { layout_name: 'Title Slide', slide_type: 'title' },
      { layout_name: 'Contents', slide_type: 'contents' },
      { layout_name: 'Legal Notice', slide_type: 'legal' }
    ];

    for (const slide of mandatorySlides) {
      const { data, error } = await client
        .from('slides')
        .insert({
          pitchbook_id: pitchbookId,
          slide_number: slideNumber++,
          layout_name: slide.layout_name,
          slide_type: slide.slide_type
        })
        .select()
        .single();

      if (error) throw error;
      slides.push(data);
    }

    // Add section slides
    for (const section of sections) {
      // Section divider
      const { data: divider, error: dividerError } = await client
        .from('slides')
        .insert({
          pitchbook_id: pitchbookId,
          section_id: section.id,
          slide_number: slideNumber++,
          layout_name: 'Section Divider',
          slide_type: 'section-divider'
        })
        .select()
        .single();

      if (dividerError) throw dividerError;
      slides.push(divider);

      // Section body slides
      for (let i = 0; i < (section.number_of_slides || 1); i++) {
        const { data: bodySlide, error: bodyError } = await client
          .from('slides')
          .insert({
            pitchbook_id: pitchbookId,
            section_id: section.id,
            slide_number: slideNumber++,
            layout_name: 'Body Text',
            slide_type: 'body'
          })
          .select()
          .single();

        if (bodyError) throw bodyError;
        slides.push(bodySlide);
      }
    }

    // Inherit template prompts if requested
    if (inheritTemplatePrompts) {
      await this.inheritTemplatePrompts(slides, client);
    }

    return slides;
  }

  // Inherit default prompts from templates
  async inheritTemplatePrompts(slides, client) {
    const layoutNames = [...new Set(slides.map(s => s.layout_name))];
    
    const { data: templates } = await client
      .from('layout_templates')
      .select('name, default_prompts')
      .in('name', layoutNames);

    if (!templates) return;

    const templateMap = templates.reduce((acc, t) => {
      acc[t.name] = t.default_prompts;
      return acc;
    }, {});

    for (const slide of slides) {
      const defaultPrompts = templateMap[slide.layout_name];
      if (defaultPrompts) {
        const placeholderPrompts = Object.entries(defaultPrompts).map(([placeholderId, prompt]) => ({
          slide_id: slide.id,
          placeholder_id: placeholderId,
          prompt_text: prompt,
          scope: 'placeholder',
          applies_to: `slide_${slide.slide_number}_placeholder_${placeholderId}`
        }));

        if (placeholderPrompts.length > 0) {
          await client
            .from('placeholder_prompts')
            .insert(placeholderPrompts);
        }
      }
    }
  }

  // Log activity
  async logActivity(userId, organizationId, pitchbookId, action, details, client) {
    try {
      await client
        .from('activity_logs')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          pitchbook_id: pitchbookId,
          action,
          details
        });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break operations
    }
  }

  // Get activity logs for a pitchbook
  async getActivityLogs(pitchbookId, accessToken) {
    const client = createUserClient(accessToken);
    
    const { data, error } = await client
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

  // Update collaboration presence
  async updatePresence(pitchbookId, userId, slideId, cursorPosition, accessToken) {
    const client = createUserClient(accessToken);
    
    const { error } = await client
      .from('collaboration_presence')
      .upsert({
        pitchbook_id: pitchbookId,
        user_id: userId,
        slide_id: slideId,
        cursor_position: cursorPosition,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'pitchbook_id,user_id'
      });

    if (error) throw error;
    return { success: true };
  }

  // Get active collaborators
  async getActiveCollaborators(pitchbookId, accessToken) {
    const client = createUserClient(accessToken);
    
    // Get collaborators active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await client
      .from('collaboration_presence')
      .select(`
        *,
        user:profiles!user_id(id, email, full_name, avatar_url)
      `)
      .eq('pitchbook_id', pitchbookId)
      .gte('last_seen', fiveMinutesAgo);

    if (error) throw error;
    return data;
  }
}

module.exports = new PitchbookService();