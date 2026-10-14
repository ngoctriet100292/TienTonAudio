import type { Metadata } from 'next';
import { PolicyDocument } from '@/components/policy-document';
import { policyDocuments } from '@/lib/policies';

const document = policyDocuments.find(item => item.slug === 'copyright')!;
export const metadata: Metadata = { title: 'Bản quyền nội dung | Tiên Tôn Audio', description: document.description };
export default function Page() { return <PolicyDocument document={document} />; }
