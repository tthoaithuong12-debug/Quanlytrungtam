import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Transaction } from '../types';
import dayjs from 'dayjs';

interface Props {
  transactions: Transaction[];
  monthsToView?: number;
}

export const D3FinancialChart: React.FC<Props> = ({ transactions, monthsToView = 6 }) => {
  const d3Container = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!d3Container.current || !transactions.length) return;

    // Process data
    const lastNMonths = Array.from({ length: monthsToView }, (_, i) => {
      return dayjs().subtract(monthsToView - 1 - i, 'month').format('YYYY-MM');
    });

    const data = lastNMonths.map(month => {
      const monthTx = transactions.filter(t => dayjs(t.date).format('YYYY-MM') === month);
      const income = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0) / 1000000;
      const expense = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0) / 1000000;
      return { month, income, expense };
    });

    // Clear previous render
    d3.select(d3Container.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = (d3Container.current.parentElement?.clientWidth || 600) - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(d3Container.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleBand()
      .domain(data.map(d => dayjs(d.month + '-01').format('MMM YYYY')))
      .range([0, width])
      .padding(0.2);
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style('fill', '#94a3b8')
      .style('font-family', 'Inter, sans-serif')
      .style('font-weight', '600')
      .style('font-size', '10px');

    svg.selectAll(".domain, .tick line").attr("stroke", "#f1f5f9");

    // Y axis
    const maxVal = d3.max(data, d => Math.max(d.income, d.expense)) || 10;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.2])
      .range([height, 0]);

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + 'M'))
      .selectAll("text")
      .style('fill', '#94a3b8')
      .style('font-family', 'Inter, sans-serif')
      .style('font-weight', '600')
      .style('font-size', '10px');

    svg.selectAll(".domain").remove();
    svg.selectAll(".tick line").attr("stroke", "#f8fafc").attr("x2", width);

    // Bars: Income
    svg.selectAll('.bar-income')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar-income')
      .attr('x', d => x(dayjs(d.month + '-01').format('MMM YYYY'))!)
      .attr('y', d => y(d.income))
      .attr('width', x.bandwidth() / 2)
      .attr('height', d => height - y(d.income))
      .attr('fill', '#4A90E2')
      .attr('rx', 4);

    // Bars: Expense
    svg.selectAll('.bar-expense')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar-expense')
      .attr('x', d => x(dayjs(d.month + '-01').format('MMM YYYY'))! + x.bandwidth() / 2)
      .attr('y', d => y(d.expense))
      .attr('width', x.bandwidth() / 2)
      .attr('height', d => height - y(d.expense))
      .attr('fill', '#FF9500')
      .attr('rx', 4);

    // Interaction & Tooltip
    const tooltip = d3.select(d3Container.current.parentElement)
      .append("div")
      .style("opacity", 0)
      .attr("class", "absolute bg-slate-900 text-white p-3 rounded-lg text-xs font-bold shadow-xl pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mt-[-10px]")
      .style("transition", "opacity 0.2s");

    svg.selectAll('rect')
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr('opacity', 0.8);
        const isIncome = d3.select(this).attr('class') === 'bar-income';
        const val = isIncome ? d.income : d.expense;
        const typeStr = isIncome ? 'Thu' : 'Chi';
        const color = isIncome ? 'text-primary' : 'text-warning';
        
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <div class="mb-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">${dayjs(d.month + '-01').format('MM/YYYY')}</div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isIncome ? 'bg-primary' : 'bg-warning'}"></span>
            <span class="${color}">${typeStr}: ${(val).toFixed(1)} Tr</span>
          </div>
        `)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr('opacity', 1);
        tooltip.transition().duration(500).style("opacity", 0);
      });

    return () => {
      tooltip.remove();
    };
  }, [transactions, monthsToView]);

  return (
    <div className="w-full relative">
      <svg ref={d3Container} className="overflow-visible" />
    </div>
  );
};
