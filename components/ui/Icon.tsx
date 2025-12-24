import React from 'react';

interface IconProps {
    name: string;
    className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = '' }) => {
    return <i className={`${name} ${className}`}></i>;
};

export default Icon;