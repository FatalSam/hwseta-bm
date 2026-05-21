'use client';

import Link from "next/link"
import Image from "next/image"

interface Props {
    breadcrumbTitle: string;
    blogMetaSingle?: boolean;
}

export default function Breadcrumb({ breadcrumbTitle, blogMetaSingle }: Props) {
    return (
        <div className={`relative w-full ${blogMetaSingle ? "pb-16" : "pb-5"}`}>
            <div className="absolute inset-0">
                <Image 
                    src="/images/breadcrumb.webp" 
                    alt="background" 
                    width={1920}
                    height={400}
                    className="w-full h-full object-cover object-bottom"
                />
                {/* Gradient Overlay - emerald/slate theme */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-emerald-900/30 to-transparent z-10" />
            </div>
            <div className="relative z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center py-14 text-center md:py-16">
                        <h1 className="text-4xl font-bold text-white mb-4">
                            {breadcrumbTitle}
                        </h1>
                        <nav className="flex items-center space-x-2 text-white/90 text-sm">
                            <Link href="/" className="hover:text-emerald-200 transition-colors">
                                Home
                            </Link>
                            <span className="text-slate-400">/</span>
                            <span className="text-emerald-200/90">{breadcrumbTitle}</span>
                        </nav>
                    </div>
                </div>
            </div>
            {blogMetaSingle && (
                <div className="absolute bottom-0 left-0 right-0 bg-white/90">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                <div className="flex items-center">
                                    <i className="icon-folder mr-2" />
                                    <a href="#" className="text-gray-600 hover:text-gray-900">Coaching</a>
                                </div>
                                <div className="flex items-center">
                                    <i className="icon-text mr-2" />
                                    <a href="#comment" className="text-gray-600 hover:text-gray-900">Post Comment</a>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <h6 className="text-sm text-gray-500">Posted By</h6>
                                    <h4 className="font-medium">Evan Thomas</h4>
                                </div>
                                <Image 
                                    alt="author" 
                                    src="https://secure.gravatar.com/avatar/7ea8dafdb4e8f044dda06278138291dd?s=50&d=mm&r=g" 
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
