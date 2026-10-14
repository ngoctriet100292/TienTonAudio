import type { Metadata } from 'next';
import { PolicyDocument } from '@/components/policy-document';
import { policyDocuments } from '@/lib/policies';

const document = policyDocuments.find(item => item.slug === 'terms')!;
export const metadata: Metadata = { title: 'Điều khoản sử dụng | Tiên Tôn Audio', description: document.description };
export default function Page() { return <PolicyDocument document={document} />; }
