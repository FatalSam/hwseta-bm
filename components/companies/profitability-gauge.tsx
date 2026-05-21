import React from 'react';
import { CircularGaugeComponent, AxesDirective, AxisDirective, Inject, Gradient } from '@syncfusion/ej2-react-circulargauge';

interface ProfitabilityGaugeProps {
    status: string;
    className?: string;
}

const ProfitabilityGauge: React.FC<ProfitabilityGaugeProps> = ({ status, className = '' }) => {
    // Map status to value (0-100)
    const getValue = (status: string): number => {
        switch (status.toLowerCase()) {
            case 'loss making':
            case 'loss':
                return 0; // Far left
            case 'breaking-even':
            case 'break-even':
            case 'break even':
                return 50; // Middle
            case 'profitable':
            case 'profit':
                return 100; // Far right
            default:
                return 50; // Default to break-even
        }
    };

    const value = getValue(status);

    return (
        <div className={`profitability-gauge ${className}`}>
            <CircularGaugeComponent
                height="150px"
                width="150px"
                background="transparent"
            >
                <Inject services={[Gradient]} />
                <AxesDirective>
                    <AxisDirective
                        startAngle={200}
                        endAngle={160}
                        minimum={0}
                        maximum={100}
                        majorTicks={{
                            useRangeColor: true,
                            interval: 50,
                            height: 10,
                            width: 2
                        }}
                        minorTicks={{
                            useRangeColor: true,
                            interval: 25,
                            height: 5,
                            width: 1
                        }}
                        lineStyle={{
                            width: 0
                        }}
                        labelStyle={{
                            useRangeColor: true,
                            font: {
                                size: '10px',
                                fontWeight: 'bold'
                            },
                            offset: 20
                        }}
                        ranges={[
                            {
                                start: 0,
                                end: 33,
                                startWidth: 10,
                                endWidth: 10,
                                color: '#ef4444',
                                radius: '85%'
                            },
                            {
                                start: 33,
                                end: 66,
                                startWidth: 10,
                                endWidth: 10,
                                color: '#3b82f6',
                                radius: '85%'
                            },
                            {
                                start: 66,
                                end: 100,
                                startWidth: 10,
                                endWidth: 10,
                                color: '#10b981',
                                radius: '85%'
                            }
                        ]}
                        pointers={[
                            {
                                value: value,
                                radius: '75%',
                                pointerWidth: 6,
                                color: '#ef4444',
                                animation: {
                                    enable: true,
                                    duration: 1000
                                }
                            }
                        ]}
                        annotations={[
                            {
                                content: '<div style="font-size: 14px; font-weight: bold; color: #ef4444; text-align: center;">0</div>',
                                angle: 200,
                                radius: '80%'
                            },
                            {
                                content: '<div style="font-size: 14px; font-weight: bold; color: #3b82f6; text-align: center;">50</div>',
                                angle: 180,
                                radius: '80%'
                            },
                            {
                                content: '<div style="font-size: 14px; font-weight: bold; color: #10b981; text-align: center;">100</div>',
                                angle: 160,
                                radius: '80%'
                            },
                            {
                                content: '<div style="font-size: 10px; font-weight: bold; color: #ef4444; text-align: center;">LOSS</div>',
                                angle: 200,
                                radius: '70%'
                            },
                            {
                                content: '<div style="font-size: 10px; font-weight: bold; color: #3b82f6; text-align: center;">BREAK-EVEN</div>',
                                angle: 180,
                                radius: '70%'
                            },
                            {
                                content: '<div style="font-size: 10px; font-weight: bold; color: #10b981; text-align: center;">PROFIT</div>',
                                angle: 160,
                                radius: '70%'
                            },
                            {
                                content: `<div style="font-size: 12px; font-weight: bold; padding: 4px 8px; background-color: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; color: ${
                                    status.toLowerCase().includes('loss') ? '#ef4444' :
                                    status.toLowerCase().includes('break') ? '#3b82f6' :
                                    status.toLowerCase().includes('profit') ? '#10b981' :
                                    '#6b7280'
                                };">${status || 'No Status'}</div>`,
                                angle: 0,
                                radius: '0%'
                            }
                        ]}
                    />
                </AxesDirective>
            </CircularGaugeComponent>
        </div>
    );
};

export default ProfitabilityGauge;
