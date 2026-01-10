import { supabase } from './supabase';
import { WorkoutLog } from '@/components/context/DataContext';

export interface Squad {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  privacy: 'private' | 'invite_only';
  avatar_url?: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface SquadPost {
  id: string;
  squad_id: string;
  user_id: string;
  post_type: 'workout' | 'check_in' | 'routine' | 'announcement';
  content: any; // WorkoutLog, check-in data, or routine data
  text?: string; // Optional caption
  created_at: string;
  updated_at: string;
}

export interface SquadPostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction: 'fire' | 'muscle' | 'clap' | 'heart' | 'star';
  created_at: string;
}

export interface SquadPostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

/**
 * Create a new squad
 */
export async function createSquad(
  name: string,
  description: string,
  privacy: 'private' | 'invite_only',
  userId: string
): Promise<Squad | null> {
  try {
    // Create squad
    const { data: squad, error: squadError } = await supabase
      .from('squads')
      .insert({
        name,
        description,
        created_by: userId,
        privacy,
        member_count: 1
      })
      .select()
      .single();

    if (squadError) {
      console.error('Error creating squad:', squadError);
      return null;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squad.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) {
      console.error('Error adding squad owner:', memberError);
      // Cleanup: delete the squad if member insert fails
      await supabase.from('squads').delete().eq('id', squad.id);
      return null;
    }

    return squad as Squad;
  } catch (error) {
    console.error('Error in createSquad:', error);
    return null;
  }
}

/**
 * Get all squads for a user
 */
export async function getUserSquads(userId: string): Promise<Squad[]> {
  try {
    const { data, error } = await supabase
      .from('squad_members')
      .select('squad_id, squads(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching user squads:', error);
      return [];
    }

    // Extract squads from the join - Supabase returns squad data as nested object
    return (data as any[])
      .map(item => item.squads)
      .filter(Boolean) as Squad[];
  } catch (error) {
    console.error('Error in getUserSquads:', error);
    return [];
  }
}

/**
 * Get squad by ID
 */
export async function getSquad(squadId: string): Promise<Squad | null> {
  try {
    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .eq('id', squadId)
      .single();

    if (error) {
      console.error('Error fetching squad:', error);
      return null;
    }

    return data as Squad;
  } catch (error) {
    console.error('Error in getSquad:', error);
    return null;
  }
}

/**
 * Get squad members
 */
export async function getSquadMembers(squadId: string): Promise<SquadMember[]> {
  try {
    // Get squad members
    const { data: members, error: membersError } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squadId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching squad members:', membersError);
      return [];
    }

    if (!members || members.length === 0) return [];

    // Get user IDs
    const userIds = members.map(m => m.user_id);

    // Fetch social profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('social_profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Return members without profile data
      return members as SquadMember[];
    }

    // Map profiles to a lookup object
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Combine member data with profile data
    return members.map(member => ({
      ...member,
      username: profileMap.get(member.user_id)?.username,
      display_name: profileMap.get(member.user_id)?.display_name,
      avatar_url: profileMap.get(member.user_id)?.avatar_url
    })) as SquadMember[];
  } catch (error) {
    console.error('Error in getSquadMembers:', error);
    return [];
  }
}

/**
 * Add member to squad (invite)
 */
export async function addSquadMember(
  squadId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squadId,
        user_id: userId,
        role
      });

    if (error) {
      console.error('Error adding squad member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addSquadMember:', error);
    return false;
  }
}

/**
 * Remove member from squad (or leave squad)
 */
export async function removeSquadMember(squadId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squadId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing squad member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeSquadMember:', error);
    return false;
  }
}

/**
 * Create a squad post (workout share, check-in, etc.)
 */
export async function createSquadPost(
  squadId: string,
  userId: string,
  postType: 'workout' | 'check_in' | 'routine' | 'announcement',
  content: any,
  text?: string
): Promise<SquadPost | null> {
  try {
    const { data, error } = await supabase
      .from('squad_posts')
      .insert({
        squad_id: squadId,
        user_id: userId,
        post_type: postType,
        content,
        text
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating squad post:', error);
      return null;
    }

    return data as SquadPost;
  } catch (error) {
    console.error('Error in createSquadPost:', error);
    return null;
  }
}

/**
 * Get squad feed (all posts)
 */
export async function getSquadFeed(squadId: string, limit = 50): Promise<SquadPost[]> {
  try {
    const { data, error } = await supabase
      .from('squad_posts')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching squad feed:', error);
      return [];
    }

    return data as SquadPost[];
  } catch (error) {
    console.error('Error in getSquadFeed:', error);
    return [];
  }
}

/**
 * Get reactions for a post
 */
export async function getPostReactions(postId: string): Promise<SquadPostReaction[]> {
  try {
    const { data, error } = await supabase
      .from('squad_post_reactions')
      .select('*')
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching post reactions:', error);
      return [];
    }

    return data as SquadPostReaction[];
  } catch (error) {
    console.error('Error in getPostReactions:', error);
    return [];
  }
}

/**
 * Add reaction to post
 */
export async function addPostReaction(
  postId: string,
  userId: string,
  reaction: 'fire' | 'muscle' | 'clap' | 'heart' | 'star'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squad_post_reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction
      });

    if (error) {
      console.error('Error adding post reaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addPostReaction:', error);
    return false;
  }
}

/**
 * Remove reaction from post
 */
export async function removePostReaction(
  postId: string,
  userId: string,
  reaction: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squad_post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction', reaction);

    if (error) {
      console.error('Error removing post reaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removePostReaction:', error);
    return false;
  }
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<SquadPostComment[]> {
  try {
    const { data, error } = await supabase
      .from('squad_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching post comments:', error);
      return [];
    }

    return data as SquadPostComment[];
  } catch (error) {
    console.error('Error in getPostComments:', error);
    return [];
  }
}

/**
 * Add comment to post
 */
export async function addPostComment(
  postId: string,
  userId: string,
  comment: string
): Promise<SquadPostComment | null> {
  try {
    const { data, error } = await supabase
      .from('squad_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        comment
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding post comment:', error);
      return null;
    }

    return data as SquadPostComment;
  } catch (error) {
    console.error('Error in addPostComment:', error);
    return null;
  }
}

/**
 * Delete comment
 */
export async function deletePostComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squad_post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePostComment:', error);
    return false;
  }
}

/**
 * Share workout to squad
 */
export async function shareWorkoutToSquad(
  squadId: string,
  userId: string,
  workout: WorkoutLog,
  caption?: string
): Promise<SquadPost | null> {
  return createSquadPost(squadId, userId, 'workout', workout, caption);
}

/**
 * Update squad details
 */
export async function updateSquad(
  squadId: string,
  updates: Partial<Pick<Squad, 'name' | 'description' | 'privacy' | 'avatar_url'>>
): Promise<Squad | null> {
  try {
    const { data, error } = await supabase
      .from('squads')
      .update(updates)
      .eq('id', squadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating squad:', error);
      return null;
    }

    return data as Squad;
  } catch (error) {
    console.error('Error in updateSquad:', error);
    return null;
  }
}

/**
 * Delete squad (owner only)
 */
export async function deleteSquad(squadId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId);

    if (error) {
      console.error('Error deleting squad:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSquad:', error);
    return false;
  }
}
