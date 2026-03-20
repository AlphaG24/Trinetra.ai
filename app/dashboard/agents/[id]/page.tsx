import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { AgentEditor } from '@/components/dashboard/AgentEditor';
import { AgentHeader } from '@/components/dashboard/AgentHeader';

interface AgentPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function AgentPage(props: AgentPageProps) {
    const params = await props.params;
    const supabase = await createClient(); // Await createClient

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (!agent) {
        redirect('/dashboard/agents');
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">

            {/* 1. Header Section */}
            <AgentHeader agent={agent} />

            {/* 2. Main Editor Area */}
            <div className="flex-1 overflow-hidden">
                <AgentEditor agent={agent} />
            </div>

        </div>
    );
}
