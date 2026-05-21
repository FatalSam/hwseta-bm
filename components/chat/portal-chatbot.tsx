'use client';

import React, { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface MessageLink {
    text: string;
    url: string;
}

interface Message {
    id: number;
    from: 'bot' | 'user';
    text: string;
    timestamp: string;
    links?: MessageLink[];
}

const PortalChatbot: React.FC = () => {
    const { isAuthenticated } = useAuthStore();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(() => {
        const now = new Date().toLocaleTimeString();
        return [
            {
                id: 1,
                from: 'bot',
                timestamp: now,
                text: isAuthenticated
                    ? 'Hi there! 👋 Welcome back to HWSETABeneficiaryHub. I\'m your virtual assistant, and I\'m here to help you navigate the portal, understand features, and answer any questions you might have. What would you like to know?'
                    : 'Hi! 👋 Welcome to HWSETABeneficiaryHub! I\'m here to help you learn about our business growth portal. I can answer questions about registration, features, how to get started, and much more. What would you like to know?'
            }
        ];
    });
    const [input, setInput] = useState('');

    const contextHint = useMemo(() => {
        if (!pathname) return '';
        if (pathname.startsWith('/dashboard/beneficiary')) {
            return 'You are on the beneficiary dashboard.';
        }
        return '';
    }, [pathname]);

    const addBotMessage = (text: string, links?: MessageLink[]) => {
        setMessages(prev => [
            ...prev,
            {
                id: prev.length + 1,
                from: 'bot',
                text,
                timestamp: new Date().toLocaleTimeString(),
                links
            }
        ]);
    };

    // Comprehensive knowledge base with human-like responses
    const getResponse = (text: string): { text: string; links?: MessageLink[] } | string | null => {
        const lower = text.toLowerCase().trim();
        
        // Registration and account questions
        if (lower.match(/\b(how|where|can i|do i)\b.*\b(register|sign up|create account|signup|registration|join|become a member)\b/i) ||
            lower.match(/\b(register|sign up|signup|registration)\b/i)) {
            return {
                text: 'To register as a beneficiary, use the Register button (top right) or the link below. You will enter your name, email, South African phone number, and a strong password. Your email is your username when you sign in.',
                links: [{ text: 'Register', url: '/signup' }]
            };
        }

        // Login questions
        if (lower.match(/\b(how|where|can i|do i)\b.*\b(login|sign in|log in|signin)\b/i) ||
            lower.match(/\b(login|sign in|log in|signin)\b/i)) {
            return {
                text: 'Use the Login button at the top-right. Sign in with your email (same as when you registered) and your password. You will be taken to your beneficiary dashboard.',
                links: [{ text: 'Login', url: '/login' }]
            };
        }

        // What is the portal / general information
        if (lower.match(/\b(what|tell me about|explain)\b.*\b(portal|hwsetabeneficiaryhub|this site|website|platform)\b/i) ||
            lower.match(/\b(what is|what does|what can)\b/i) && (lower.includes('this') || lower.includes('portal') || lower.includes('site'))) {
            return {
                text: 'This is the HWSETA Beneficiary Hub. You can register a beneficiary account, sign in with your email, and use your dashboard for monitoring. More features will appear as they are connected to the HWSETA API.',
                links: !isAuthenticated ? [{ text: 'Register', url: '/signup' }] : undefined
            };
        }

        // Help / support questions
        if (lower.match(/\b(help|support|assistance|stuck|confused|don't know|don\'t know|need help)\b/i)) {
            return 'I\'m here to help! I can guide you through:\n\n' +
                   '• How to register or log in\n' +
                   '• Where to upload documents\n' +
                   '• How to complete your company information\n' +
                   '• Understanding gap analysis and age analysis\n' +
                   '• Navigating different sections of the portal\n\n' +
                   'Just ask me a specific question, and I\'ll do my best to help you. What would you like to know?';
        }

        // Where to start / getting started
        if (lower.match(/\b(where|how)\b.*\b(start|begin|get started|first step|beginning)\b/i) ||
            lower.match(/\b(what should|what do|what can)\b.*\b(first|start|begin|do first)\b/i)) {
            return 'Great question! Here\'s a helpful roadmap to get you started:\n\n' +
                   '1️⃣ **Complete Your Profile**: Start with Company Information and Ownership Information sections\n' +
                   '2️⃣ **Upload Documents**: Add your company documents (registration, compliance, bank letters)\n' +
                   '3️⃣ **Financial Setup**: Enter your financial information and upload statements\n' +
                   '4️⃣ **Gap Analysis**: Complete the gap analysis questionnaire to see where your business needs support\n' +
                   '5️⃣ **Explore Features**: Check out Progress Reports, Coaching, and Skills Programmes\n\n' +
                   'Don\'t worry about doing everything at once - you can work through it step by step at your own pace!';
        }

        // Document upload questions
        if (lower.match(/\b(how|where|can i|do i)\b.*\b(upload|add|attach|submit)\b.*\b(document|file|statement)\b/i) ||
            lower.match(/\b(upload|add|attach)\b.*\b(document|file|statement)\b/i)) {
            return 'To upload documents, navigate to the "Documents" section in your dashboard menu. ' +
                   'You\'ll find different categories:\n\n' +
                   '• **Company Documents**: For registration papers, compliance certificates, and bank letters\n' +
                   '• **Financial Documents**: For financial statements, bank statements, and tax records\n' +
                   '• **Other Categories**: Depending on your needs\n\n' +
                   'Simply click on the relevant section, then use the "Click to browse or drag and drop" area to upload your files. ' +
                   'Most common file formats are supported (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG).';
        }

        // Age analysis questions
        if (lower.match(/\b(age analysis|aging analysis|ageing analysis|what is age analysis|how does age analysis)\b/i)) {
            return 'Age analysis is a powerful feature that helps you understand your business\'s financial health over time. ' +
                   'Here\'s how it works:\n\n' +
                   '**Step 1**: Go to Financial Information and enter your income, cost of sales, and operational expenses\n' +
                   '**Step 2**: Upload your latest financial statements and 6-month bank statements\n' +
                   '**Step 3**: Visit the Progress or Gap Analysis section to see your trends, risk flags, and areas for improvement\n\n' +
                   'The system analyzes your data to show you patterns, identify potential issues, and highlight opportunities for growth. ' +
                   'It\'s like having a financial advisor reviewing your business performance!';
        }

        // Gap analysis questions
        if (lower.match(/\b(gap analysis|gap assessment|what is gap|how does gap)\b/i)) {
            return 'Gap Analysis helps you identify where your business needs support to become more formalized and funding-ready. ' +
                   'It works by asking you a series of questions about different aspects of your business:\n\n' +
                   '• Business planning and strategy\n' +
                   '• Legal and regulatory compliance\n' +
                   '• Financial management\n' +
                   '• Operations and systems\n\n' +
                   'Based on your answers, you\'ll get a score and a detailed roadmap showing:\n' +
                   '• What you\'re doing well\n' +
                   '• Areas that need improvement\n' +
                   '• Estimated costs for formalization\n' +
                   '• Resources and next steps\n\n' +
                   'You can access it from the Gap Analysis menu item. It\'s completely free and takes about 15-30 minutes to complete!';
        }

        // Financial information questions
        if (lower.match(/\b(financial|income|expense|expenditure|profit|revenue)\b/i) && 
            (lower.includes('how') || lower.includes('where') || lower.includes('what'))) {
            return 'The Financial Information section is where you manage all your financial data. Here\'s what you can do:\n\n' +
                   '• **Enter Monthly Income**: Track your average monthly revenue\n' +
                   '• **Enter Monthly Expenditure**: Record your average monthly expenses\n' +
                   '• **Profitability Status**: Indicate whether your business is profitable\n' +
                   '• **Upload Statements**: Add 6-month bank statements and financial statements\n\n' +
                   'This information is used for age analysis and helps generate insights about your business performance. ' +
                   'You can find it in the dashboard menu under "Financial Information".';
        }

        // Company information questions
        if (lower.match(/\b(company info|company information|business details|company profile)\b/i)) {
            return 'Company Information is where you store all the essential details about your business. ' +
                   'This includes things like:\n\n' +
                   '• Business name and registration details\n' +
                   '• Contact information\n' +
                   '• Business type and industry\n' +
                   '• Location and address\n\n' +
                   'You can access it from the dashboard menu. It\'s important to keep this information up to date, ' +
                   'as it\'s used throughout the portal for various features and reports.';
        }

        // Progress / dashboard questions
        if (lower.match(/\b(progress|dashboard|reports|how am i doing|performance)\b/i)) {
            return 'The Progress dashboard gives you a comprehensive view of your business performance. You can see:\n\n' +
                   '• Your gap analysis scores over time\n' +
                   '• Financial trends and patterns\n' +
                   '• Age analysis results\n' +
                   '• Profile completion status\n' +
                   '• Cost of formalization\n\n' +
                   'It\'s like your business health checkup! You can access it from the main dashboard or the Progress menu item. ' +
                   'The charts and metrics help you track your improvement and see where you\'re making progress.';
        }

        // Coaching / workshops questions
        if (lower.match(/\b(coaching|workshop|skills|training|learn|education)\b/i)) {
            return 'HWSETABeneficiaryHub offers several learning and development resources:\n\n' +
                   '• **Business Coaching**: Get personalized guidance for your business challenges\n' +
                   '• **Business Skills Programme**: Access structured learning modules and assignments\n' +
                   '• **Business Workshops**: Participate in workshops to develop specific skills\n\n' +
                   'These resources are designed to help you grow your business knowledge and capabilities. ' +
                   'You can find them in the dashboard menu. Some features may be coming soon, so keep an eye out for updates!';
        }

        // Password / account issues
        if (lower.match(/\b(forgot|forget|reset|change|lost)\b.*\b(password|account|login)\b/i)) {
            return 'If you\'ve forgotten your password, look for a "Forgot Password" or "Reset Password" link on the login page. ' +
                   'You\'ll typically need to enter your email address, and you\'ll receive instructions to reset your password. ' +
                   'If you\'re having trouble accessing your account, make sure you\'re using the correct email or username. ' +
                   'If problems persist, you may need to contact support for further assistance.';
        }

        // Pricing / cost questions
        if (lower.match(/\b(price|cost|fee|free|paid|subscription|payment)\b/i)) {
            return 'HWSETABeneficiaryHub is designed to support SMMEs, and many of our core features are available to help you grow your business. ' +
                   'The gap analysis, document management, and basic financial tracking are typically free to use. ' +
                   'Some advanced features or coaching services may have associated costs. ' +
                   'For specific pricing information, I\'d recommend checking the portal or contacting support for the most current details.';
        }

        // Vague questions - provide helpful guidance
        if (lower.length < 10 || lower.match(/\b(hi|hello|hey|thanks|thank you|ok|okay|yes|no)\b/i)) {
            if (lower.match(/\b(hi|hello|hey)\b/i)) {
                return 'Hello! 👋 I\'m here to help you navigate HWSETABeneficiaryHub. ' +
                       'You can ask me about registration, how to use different features, where to find things, or anything else about the portal. What would you like to know?';
            }
            if (lower.match(/\b(thanks|thank you)\b/i)) {
                return 'You\'re very welcome! 😊 If you have any other questions, feel free to ask. I\'m here to help!';
            }
            return 'I\'m here to help! Could you tell me a bit more about what you\'d like to know? ' +
                   'For example, you could ask:\n' +
                   '• "How do I register?"\n' +
                   '• "Where do I upload documents?"\n' +
                   '• "What is gap analysis?"\n' +
                   '• "How do I get started?"';
        }

        return null; // No match found
    };

    const handleUserMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const now = new Date().toLocaleTimeString();
        setMessages(prev => [
            ...prev,
            { id: prev.length + 1, from: 'user', text: trimmed, timestamp: now }
        ]);

        // Try to get a response from knowledge base
        const response = getResponse(trimmed);
        
        if (response) {
            if (typeof response === 'string') {
                addBotMessage(response);
            } else {
                addBotMessage(response.text, response.links);
            }
            return;
        }

        // Context-aware responses for authenticated users
        if (isAuthenticated) {
            if (contextHint) {
            addBotMessage(
                    `${contextHint}\n\nI can help you with specific questions about this section. For example:\n` +
                    `• "How do I use this page?"\n` +
                    `• "What information should I enter here?"\n` +
                    `• "How does this relate to age analysis?"`
            );
            return;
        }

            // Fallback for authenticated users
            addBotMessage(
                'I can help you with various aspects of HWSETABeneficiaryHub! Here are some things you can ask me:\n\n' +
                '• "How do I do age analysis?"\n' +
                '• "Where do I upload financial statements?"\n' +
                '• "What is gap analysis?"\n' +
                '• "How do I complete my company information?"\n' +
                '• "What should I do first?"\n\n' +
                'Or ask me about any specific feature or section you\'re working on!'
            );
            return;
        }

        // Fallback for unauthenticated users
            addBotMessage(
            'I can help you learn about HWSETABeneficiaryHub! Here are some common questions:\n\n' +
            '• "How do I register?"\n' +
            '• "What is this portal?"\n' +
            '• "How do I log in?"\n' +
            '• "What features are available?"\n\n' +
            'For personalized guidance and access to all features, please sign up or log in to your account. ' +
            'It\'s free and only takes a minute!'
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleUserMessage(input);
        setInput('');
    };

    return (
        <div className="fixed bottom-4 left-2 sm:left-auto sm:right-4 z-50 max-w-[calc(100vw-1rem)] sm:max-w-none">
            {/* Toggle button */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="rounded-full bg-hwseta-green text-white shadow-lg px-3 py-2 text-xs sm:text-sm sm:px-4 font-medium hover:bg-hwseta-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hwseta-green whitespace-nowrap"
                >
                    Chat with us
                </button>
            )}

            {isOpen && (
                <div className="w-full sm:w-80 md:w-96 h-96 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-hwseta-green text-white">
                        <div>
                            <p className="text-sm font-semibold">HWSETABeneficiaryHub Assistant</p>
                            <p className="text-xs text-white/85">
                                {isAuthenticated ? 'Guiding you through your dashboard' : 'General info about the portal'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-white/85 hover:text-white text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>

                    <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto text-sm bg-gray-50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        msg.from === 'user'
                                            ? 'bg-hwseta-green text-white'
                                            : 'bg-white text-slate-800 border border-slate-200'
                                    }`}
                                >
                                    <div className="whitespace-pre-line">{msg.text}</div>
                                    {msg.links && msg.links.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {msg.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url}
                                                    className="block w-full text-center px-3 py-1.5 text-xs font-medium rounded-md bg-hwseta-green text-white hover:bg-hwseta-green-dark transition-colors"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {link.text}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    <p className="mt-1 text-[10px] opacity-70 text-right">{msg.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={
                                    isAuthenticated
                                        ? 'Ask me anything - features, how to use something, where to find things...'
                                        : 'Ask me anything - registration, features, how to get started...'
                                }
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-hwseta-green"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1 text-sm font-medium rounded-md bg-hwseta-green text-white hover:bg-hwseta-green-dark disabled:opacity-50"
                                disabled={!input.trim()}
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PortalChatbot;


