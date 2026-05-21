'use client';

import { useState } from "react"
import ModalVideo from 'react-modal-video'

export default function VideoBox() {
    const [isOpen, setOpen] = useState(false)
    return (
        <>
            <a onClick={() => setOpen(true)} className="lightbox-image"><i className="icon-play" /></a>
            <ModalVideo channel='youtube' isOpen={isOpen} videoId="vfhzo499OeA" onClose={() => setOpen(false)} />
        </>
    )
}
